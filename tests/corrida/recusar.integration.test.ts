import { PrismaRecusaOfertaRepository } from "@/modules/corrida/PrismaRecusaOfertaRepository";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusCorrida } from "@/generated/prisma/client";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

// Nunca usa DATABASE_URL nem carrega .env. Cada execução cria seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para um PostgreSQL de testes.");
const schema = `test_recusa_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString });
const banco = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
let categoriaVeiculoId: string;
let contador = 0;
let conectado = false;

async function dados(): Promise<CriarCorridaRepositoryDTO> {
  const usuario = await banco.usuario.create({ data: {
    nome: "Teste", cpf: String(++contador).padStart(11, "0"),
    email: `${randomUUID()}@test.invalid`, senhaHash: "teste",
  } });
  return {
    passageiroId: usuario.id, categoriaVeiculoId,
    origemEndereco: "Origem", destinoEndereco: "Destino",
    origemLatitude: -16, origemLongitude: -57, destinoLatitude: -16.1, destinoLongitude: -57.1,
    distanciaKm: "1.005", valorKmAplicado: "1.00", valorTotal: "1.01",
  };
}

beforeAll(async () => {
  await admin.connect();
  conectado = true;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`SET search_path TO "${schema}"`);
  const diretorio = new URL("../../prisma/migrations/", import.meta.url);
  for (const pasta of readdirSync(diretorio, { withFileTypes: true }).filter((p) => p.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    await admin.query(readFileSync(new URL(`${pasta.name}/migration.sql`, diretorio), "utf8"));
  }
  const tipo = await banco.tipoVeiculo.create({ data: { nome: "Carro" } });
  const categoria = await banco.categoriaVeiculo.create({ data: { nome: "Teste", tipoVeiculoId: tipo.id } });
  categoriaVeiculoId = categoria.id;
});

afterAll(async () => {
  await banco.$disconnect();
  // Identificador gerado internamente; somente o schema desta execução é removido.
  if (conectado) await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end();
});


const consultas = new PrismaCorridaConsultaRepository(banco);
async function motorista(statusAprovacao: "APROVADO" | "PENDENTE" | "REJEITADO" = "APROVADO") {
  const entrada = await dados();
  const prestador = await banco.prestador.create({ data: { usuarioId: entrada.passageiroId, statusAprovacao } });
  const veiculo = await banco.veiculo.create({ data: { statusAprovacao: "APROVADO", prestadorId: prestador.id, categoriaVeiculoId, placa: String(contador), marca: "Teste", modelo: "Teste", ano: 2026 } });
  if (statusAprovacao === "APROVADO") await new PrismaDisponibilidadePrestadorRepository(banco).alterar(entrada.passageiroId, { status: "ONLINE", veiculoId: veiculo.id, versao: 0 });
  return { usuarioId: entrada.passageiroId, prestadorId: prestador.id, veiculoId: veiculo.id };
}
async function corrida(status: StatusCorrida = "SOLICITADA", usuarioId?: string) {
  const entrada = await dados();
  const c = await banco.corrida.create({ data: { ...entrada, passageiroId: usuarioId ?? entrada.passageiroId, status } });
  return c;
}



const recusas = new PrismaRecusaOfertaRepository(banco);
const escrita = new PrismaCorridaRepository(banco);
it("recusa é individual, idempotente e não cancela a corrida", async () => {
  const a = await motorista(); const b = await motorista(); const c = await corrida();
  const antes = await banco.corrida.findUniqueOrThrow({ where: { id: c.id } });
  const primeira = await recusas.recusar({ usuarioId: a.usuarioId, corridaId: c.id });
  expect(await recusas.recusar({ usuarioId: a.usuarioId, corridaId: c.id })).toEqual(primeira);
  expect(await banco.recusaOferta.count({ where: { corridaId: c.id } })).toBe(1);
  expect(await banco.corrida.findUniqueOrThrow({ where: { id: c.id } })).toEqual(antes);
  expect((await consultas.disponiveis(a.usuarioId, { veiculoId: a.veiculoId, limite: 50 })).corridas.some(v => v.id === c.id)).toBe(false);
  expect((await consultas.disponiveis(b.usuarioId, { veiculoId: b.veiculoId, limite: 50 })).corridas.some(v => v.id === c.id)).toBe(true);
  await expect(escrita.aceitar({ usuarioId: a.usuarioId, corridaId: c.id, veiculoId: a.veiculoId })).rejects.toMatchObject({ statusCode: 409 });
  expect((await escrita.aceitar({ usuarioId: b.usuarioId, corridaId: c.id, veiculoId: b.veiculoId })).status).toBe("ACEITA");
});
it("duas recusas simultâneas retornam o mesmo registro", async () => {
  const a = await motorista(); const c = await corrida();
  const entrada = { usuarioId: a.usuarioId, corridaId: c.id };
  const [r1, r2] = await Promise.all([recusas.recusar(entrada), recusas.recusar(entrada)]);
  expect(r1).toEqual(r2);
  expect(await banco.recusaOferta.count({ where: { corridaId: c.id } })).toBe(1);
});
it("aceite e recusa simultâneos pelo mesmo prestador não se confirmam juntos", async () => {
  const a = await motorista(); const c = await corrida();
  const resultados = await Promise.allSettled([
    recusas.recusar({ usuarioId: a.usuarioId, corridaId: c.id }),
    escrita.aceitar({ usuarioId: a.usuarioId, corridaId: c.id, veiculoId: a.veiculoId }),
  ]);
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const salva = await banco.corrida.findUniqueOrThrow({ where: { id: c.id } });
  const total = await banco.recusaOferta.count({ where: { corridaId: c.id } });
  expect(total).toBe(salva.status === "ACEITA" ? 0 : 1);
});
