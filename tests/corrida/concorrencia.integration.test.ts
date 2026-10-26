import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusCorrida } from "@/generated/prisma/client";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

// Nunca usa DATABASE_URL nem carrega .env. Cada execução cria seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para um PostgreSQL de testes.");
const schema = `test_corrida_${randomUUID().replaceAll("-", "")}`;
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

describe("Solicitação no PostgreSQL real", () => {
  it.each<StatusCorrida>(["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"])("bloqueia segunda corrida quando existe %s", async (status) => {
    const entrada = await dados();
    const primeira = await repository.criar(entrada);
    await banco.corrida.update({ where: { id: primeira.id }, data: { status } });
    await expect(repository.criar(entrada)).rejects.toMatchObject({ statusCode: 409 });
    expect(await banco.corrida.count({ where: { passageiroId: entrada.passageiroId } })).toBe(1);
  });

  it.each<StatusCorrida>(["CANCELADA", "FINALIZADA", "ENCERRADA_ANTECIPADAMENTE"])("permite nova solicitação depois de %s", async (status) => {
    const entrada = await dados();
    const primeira = await repository.criar(entrada);
    await banco.corrida.update({ where: { id: primeira.id }, data: { status } });
    expect((await repository.criar(entrada)).status).toBe("SOLICITADA");
  });

  it("serializa duas leituras concorrentes vazias: exatamente uma criação e um 409", async () => {
    const entrada = await dados();
    let leituras = 0;
    let liberar!: () => void;
    const barreira = new Promise<void>((resolve) => { liberar = resolve; });
    const sincronizado = banco.$extends({ query: { corrida: {
      async findFirst({ args, query }) {
        const resultado = await query(args);
        leituras++;
        if (leituras <= 2) {
          expect(resultado).toBeNull();
          if (leituras === 2) liberar();
          await barreira;
        }
        return resultado;
      },
    } } });
    const concorrente = new PrismaCorridaRepository(sincronizado as unknown as PrismaClient);
    const resultados = await Promise.allSettled([concorrente.criar(entrada), concorrente.criar(entrada)]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { statusCode: 409 } });
    expect(leituras).toBeGreaterThanOrEqual(3); // A transação perdedora releu após P2034.
    expect(await banco.corrida.count({ where: { passageiroId: entrada.passageiroId } })).toBe(1);
    const salva = await banco.corrida.findFirstOrThrow({ where: { passageiroId: entrada.passageiroId } });
    expect(salva.valorTotal.toFixed(2)).toBe("1.01");
  });

  it("permite solicitações de passageiros diferentes", async () => {
    const a = await dados();
    const b = await dados();
    const resultados = await Promise.all([repository.criar(a), repository.criar(b)]);
    expect(new Set(resultados.map((r) => r.passageiroId)).size).toBe(2);
  });
});
