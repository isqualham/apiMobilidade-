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
const schema = `test_disponibilidade_${randomUUID().replaceAll("-", "")}`;
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
  const veiculo = await banco.veiculo.create({ data: { prestadorId: prestador.id, categoriaVeiculoId, placa: String(contador), marca: "Teste", modelo: "Teste", ano: 2026 } });
  if (statusAprovacao === "APROVADO") await new PrismaDisponibilidadePrestadorRepository(banco).alterar(entrada.passageiroId, { status: "ONLINE", veiculoId: veiculo.id, versao: 0 });
  return { usuarioId: entrada.passageiroId, prestadorId: prestador.id, veiculoId: veiculo.id };
}
async function corrida(status: StatusCorrida = "SOLICITADA", usuarioId?: string) {
  const entrada = await dados();
  const c = await banco.corrida.create({ data: { ...entrada, passageiroId: usuarioId ?? entrada.passageiroId, status } });
  return c;
}


const disponibilidade = new PrismaDisponibilidadePrestadorRepository(banco);
it("estado inicial Offline, seleção e versão compartilhada entre sessões", async () => {
  const entrada = await dados();
  const p = await banco.prestador.create({ data: { usuarioId: entrada.passageiroId, statusAprovacao: "APROVADO" } });
  const v = await banco.veiculo.create({ data: { prestadorId: p.id, categoriaVeiculoId, placa: randomUUID().slice(0, 8), marca: "Teste", modelo: "Teste", ano: 2026 } });
  expect(await disponibilidade.consultar(p.usuarioId)).toEqual({ status: "OFFLINE", veiculoId: null, versao: 0 });
  await expect(consultas.disponiveis(p.usuarioId, { veiculoId: v.id, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  const chamadas = await Promise.allSettled([
    disponibilidade.alterar(p.usuarioId, { status: "ONLINE", veiculoId: v.id, versao: 0 }),
    disponibilidade.alterar(p.usuarioId, { status: "ONLINE", veiculoId: v.id, versao: 0 }),
  ]);
  expect(chamadas.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(chamadas.find(r => r.status === "rejected")).toMatchObject({ reason: { statusCode: 409 } });
  expect(await disponibilidade.consultar(p.usuarioId)).toEqual({ status: "ONLINE", veiculoId: v.id, versao: 1 });
});
it("aceite concorrente com Offline nunca confirma corrida com prestador Offline", async () => {
  const m = await motorista(); const c = await corrida();
  const resultados = await Promise.allSettled([
    new PrismaCorridaRepository(banco).aceitar({ corridaId: c.id, usuarioId: m.usuarioId, veiculoId: m.veiculoId }),
    disponibilidade.alterar(m.usuarioId, { status: "OFFLINE", versao: 1 }),
  ]);
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const salva = await banco.corrida.findUniqueOrThrow({ where: { id: c.id } });
  const estado = await disponibilidade.consultar(m.usuarioId);
  if (salva.status === "ACEITA") expect(estado.veiculoId).toBe(m.veiculoId);
  else expect(estado.status).toBe("OFFLINE");
});
it("troca de veículo concorrente com aceite mantém vínculo correto", async () => {
  const m = await motorista(); const c = await corrida();
  const outro = await banco.veiculo.create({ data: { prestadorId: m.prestadorId, categoriaVeiculoId, placa: randomUUID().slice(0, 8), marca: "Teste", modelo: "Teste", ano: 2026 } });
  const resultados = await Promise.allSettled([
    new PrismaCorridaRepository(banco).aceitar({ corridaId: c.id, usuarioId: m.usuarioId, veiculoId: m.veiculoId }),
    disponibilidade.alterar(m.usuarioId, { status: "ONLINE", veiculoId: outro.id, versao: 1 }),
  ]);
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const salva = await banco.corrida.findUniqueOrThrow({ where: { id: c.id } });
  const estado = await disponibilidade.consultar(m.usuarioId);
  expect(estado.veiculoId).toBe(salva.status === "ACEITA" ? m.veiculoId : outro.id);
});
it("corrida ativa bloqueia troca e Offline; finalização libera alteração", async () => {
  const m = await motorista(); const c = await corrida();
  const repo = new PrismaCorridaRepository(banco);
  await repo.aceitar({ corridaId: c.id, usuarioId: m.usuarioId, veiculoId: m.veiculoId });
  await expect(disponibilidade.alterar(m.usuarioId, { status: "OFFLINE", versao: 1 })).rejects.toMatchObject({ statusCode: 409 });
  await expect(disponibilidade.alterar(m.usuarioId, { status: "ONLINE", veiculoId: m.veiculoId, versao: 1 })).rejects.toMatchObject({ statusCode: 409 });
  await repo.iniciar(c.id, m.usuarioId); await repo.finalizar(c.id, m.usuarioId);
  expect((await disponibilidade.alterar(m.usuarioId, { status: "OFFLINE", versao: 1 })).status).toBe("OFFLINE");
});
it("recusa veículo de terceiro, inativo, categoria inativa e prestador pendente", async () => {
  const m = await motorista(); const outro = await motorista();
  await expect(disponibilidade.alterar(m.usuarioId, { status: "ONLINE", veiculoId: outro.veiculoId, versao: 1 })).rejects.toMatchObject({ statusCode: 403 });
  await banco.veiculo.update({ where: { id: m.veiculoId }, data: { ativo: false } });
  await expect(disponibilidade.alterar(m.usuarioId, { status: "ONLINE", veiculoId: m.veiculoId, versao: 1 })).rejects.toMatchObject({ statusCode: 403 });
  await banco.veiculo.update({ where: { id: m.veiculoId }, data: { ativo: true } });
  await banco.categoriaVeiculo.update({ where: { id: categoriaVeiculoId }, data: { ativo: false } });
  await expect(disponibilidade.alterar(m.usuarioId, { status: "ONLINE", veiculoId: m.veiculoId, versao: 1 })).rejects.toMatchObject({ statusCode: 403 });
  await banco.categoriaVeiculo.update({ where: { id: categoriaVeiculoId }, data: { ativo: true } });
  const pendente = await motorista("PENDENTE");
  await expect(disponibilidade.alterar(pendente.usuarioId, { status: "ONLINE", veiculoId: pendente.veiculoId, versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
});

it.each(["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"] as const)("corrida %s como passageiro impede mudança", async status => {
  const m = await motorista();
  await corrida(status, m.usuarioId);
  await expect(disponibilidade.alterar(m.usuarioId, { status: "OFFLINE", versao: 1 })).rejects.toMatchObject({ statusCode: 409 });
});
