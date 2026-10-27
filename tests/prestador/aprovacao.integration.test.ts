import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrismaPrestadorRepository } from "@/modules/prestador/PrismaPrestadorRepository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusAprovacao } from "@/generated/prisma/client";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

// Nunca usa DATABASE_URL nem carrega .env. Cada execução cria seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para um PostgreSQL de testes.");
const schema = `test_aprovacao_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString });
const banco = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
const repository = new PrismaCorridaRepository(banco);
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


const aprovacao = new PrismaPrestadorRepository(banco);
let administradorId: string;
async function novoPrestador(statusAprovacao: StatusAprovacao = "PENDENTE") {
  const entrada = await dados();
  return banco.prestador.create({ data: { usuarioId: entrada.passageiroId, statusAprovacao } });
}
beforeAll(async () => {
  const entrada = await dados();
  administradorId = entrada.passageiroId;
  await banco.usuario.update({ where: { id: administradorId }, data: { administrador: true } });
});

describe("Aprovação no PostgreSQL isolado", () => {
  it.each(["APROVADO", "REJEITADO"] as const)("decide %s para cadastro pendente", async (statusAprovacao) => {
    const prestador = await novoPrestador();
    const resposta = await aprovacao.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao });
    expect(resposta.statusAprovacao).toBe(statusAprovacao);
    expect(resposta.usuarioId).toBe(prestador.usuarioId);
    expect((await banco.prestador.findUniqueOrThrow({ where: { id: prestador.id } })).statusAprovacao).toBe(statusAprovacao);
  });
  it("retorna 404 para prestador inexistente", async () => {
    await expect(aprovacao.decidirAprovacao({ prestadorId: randomUUID(), administradorId, statusAprovacao: "APROVADO" })).rejects.toMatchObject({ statusCode: 404 });
  });
  it.each(["APROVADO", "REJEITADO"] as const)("não reavalia cadastro %s", async (statusAprovacao) => {
    const prestador = await novoPrestador(statusAprovacao);
    for (const decisao of ["APROVADO", "REJEITADO"] as const) {
      await expect(aprovacao.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao: decisao })).rejects.toMatchObject({ statusCode: 409 });
    }
    expect((await banco.prestador.findUniqueOrThrow({ where: { id: prestador.id } })).statusAprovacao).toBe(statusAprovacao);
  });
  it("recusa usuário de prestador inativo", async () => {
    const prestador = await novoPrestador();
    await banco.usuario.update({ where: { id: prestador.usuarioId }, data: { ativo: false } });
    await expect(aprovacao.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao: "APROVADO" })).rejects.toMatchObject({ statusCode: 409 });
  });
  it.each(["comum", "inativo", "inexistente"])("revalida administrador %s dentro do repositório", async (tipo) => {
    const prestador = await novoPrestador();
    const entrada = await dados();
    if (tipo === "inativo") await banco.usuario.update({ where: { id: entrada.passageiroId }, data: { administrador: true, ativo: false } });
    await expect(aprovacao.decidirAprovacao({ prestadorId: prestador.id, administradorId: tipo === "inexistente" ? randomUUID() : entrada.passageiroId, statusAprovacao: "APROVADO" })).rejects.toMatchObject({ statusCode: 403 });
    expect((await banco.prestador.findUniqueOrThrow({ where: { id: prestador.id } })).statusAprovacao).toBe("PENDENTE");
  });
  it("duas decisões simultâneas têm uma vencedora e um conflito sem sobrescrita", async () => {
    const prestador = await novoPrestador();
    let leituras = 0;
    let liberar!: () => void;
    const barreira = new Promise<void>((resolve) => { liberar = resolve; });
    const sincronizado = banco.$extends({ query: { prestador: {
      async findUnique({ args, query }) {
        const resultado = await query(args);
        if (++leituras <= 2) {
          expect(resultado?.statusAprovacao).toBe("PENDENTE");
          if (leituras === 2) liberar();
          await barreira;
        }
        return resultado;
      },
    } } });
    const concorrente = new PrismaPrestadorRepository(sincronizado as unknown as PrismaClient);
    const resultados = await Promise.allSettled([
      concorrente.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao: "APROVADO" }),
      concorrente.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao: "REJEITADO" }),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { statusCode: 409 } });
    const vencedor = resultados.find((r) => r.status === "fulfilled");
    expect((await banco.prestador.findUniqueOrThrow({ where: { id: prestador.id } })).statusAprovacao).toBe(vencedor?.status === "fulfilled" ? vencedor.value.statusAprovacao : undefined);
  });
  it.each(["PENDENTE", "REJEITADO"] as const)("repositório de corridas recusa prestador %s", async (status) => {
    const prestador = await novoPrestador(status);
    await expect(repository.aceitar({ corridaId: randomUUID(), usuarioId: prestador.usuarioId, veiculoId: randomUUID() })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("aprovar habilita o aceite de corrida com veículo compatível", async () => {
    const prestador = await novoPrestador();
    const veiculo = await banco.veiculo.create({ data: { prestadorId: prestador.id, categoriaVeiculoId, placa: "TEST001", marca: "Teste", modelo: "Teste", ano: 2026 } });
    const corrida = await repository.criar(await dados());
    const aceite = { corridaId: corrida.id, usuarioId: prestador.usuarioId, veiculoId: veiculo.id };
    await expect(repository.aceitar(aceite)).rejects.toMatchObject({ statusCode: 403 });
    await aprovacao.decidirAprovacao({ prestadorId: prestador.id, administradorId, statusAprovacao: "APROVADO" });
    await new PrismaDisponibilidadePrestadorRepository(banco).alterar(prestador.usuarioId, { status: "ONLINE", veiculoId: veiculo.id, versao: 0 });
    expect((await repository.aceitar(aceite)).status).toBe("ACEITA");
  });
});
