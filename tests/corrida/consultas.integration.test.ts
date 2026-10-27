import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusCorrida } from "@/generated/prisma/client";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

// Nunca usa DATABASE_URL nem carrega .env. Cada execução cria seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para um PostgreSQL de testes.");
const schema = `test_leitura_${randomUUID().replaceAll("-", "")}`;
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
const decodificar = (cursor: string) => JSON.parse(Buffer.from(cursor, "base64url").toString());
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

describe("Privacidade e consultas no PostgreSQL", () => {
  it("detalhes somente para passageiro e prestador vinculados", async () => {
    const m = await motorista();
    const outro = await motorista();
    const c = await corrida("ACEITA");
    await banco.corrida.update({ where: { id: c.id }, data: { prestadorId: m.prestadorId, veiculoId: m.veiculoId } });
    expect((await consultas.detalhe(c.passageiroId, c.id))?.papel).toBe("passageiro");
    const detalhe = await consultas.detalhe(m.usuarioId, c.id);
    expect(detalhe?.papel).toBe("prestador");
    expect(detalhe?.origem.endereco).toBe("Origem");
    expect(detalhe).not.toHaveProperty("passageiroId");
    expect(await consultas.detalhe(outro.usuarioId, c.id)).toBeNull();
    expect(await consultas.detalhe((await dados()).passageiroId, c.id)).toBeNull();
    expect(await consultas.detalhe(m.usuarioId, randomUUID())).toBeNull();
  });
  it("administrador não ganha acesso aos detalhes de terceiros", async () => {
    const a = await dados();
    await banco.usuario.update({ where: { id: a.passageiroId }, data: { administrador: true } });
    expect(await consultas.detalhe(a.passageiroId, (await corrida()).id)).toBeNull();
  });
  it.each<StatusCorrida>(["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"])("identifica ativa %s", async (status) => {
    const c = await corrida(status);
    expect((await consultas.ativa(c.passageiroId, "todos"))?.id).toBe(c.id);
    expect((await consultas.historico(c.passageiroId, { limite: 20, papel: "todos" })).corridas).toEqual([]);
  });
  it.each<StatusCorrida>(["CANCELADA", "FINALIZADA", "ENCERRADA_ANTECIPADAMENTE"])("inclui %s somente no histórico", async (status) => {
    const c = await corrida(status);
    expect(await consultas.ativa(c.passageiroId, "todos")).toBeNull();
    expect((await consultas.historico(c.passageiroId, { limite: 20, papel: "todos" })).corridas.map((x) => x.id)).toEqual([c.id]);
  });
  it("duplo papel exige seleção quando há duas ativas", async () => {
    const m = await motorista();
    const passageiro = await corrida("SOLICITADA", m.usuarioId);
    const prestador = await corrida("ACEITA");
    await banco.corrida.update({ where: { id: prestador.id }, data: { prestadorId: m.prestadorId } });
    await expect(consultas.ativa(m.usuarioId, "todos")).rejects.toMatchObject({ statusCode: 409 });
    expect((await consultas.ativa(m.usuarioId, "passageiro"))?.id).toBe(passageiro.id);
    expect((await consultas.ativa(m.usuarioId, "prestador"))?.id).toBe(prestador.id);
  });
  it("histórico pagina empates de data sem duplicar nem expor terceiros", async () => {
    const a = await dados();
    const cs = await Promise.all([corrida("FINALIZADA", a.passageiroId), corrida("CANCELADA", a.passageiroId), corrida("FINALIZADA", a.passageiroId)]);
    await banco.corrida.updateMany({ where: { id: { in: cs.map((c) => c.id) } }, data: { createdAt: new Date("2026-01-01") } });
    const primeira = await consultas.historico(a.passageiroId, { limite: 2, papel: "todos" });
    const segunda = await consultas.historico(a.passageiroId, { limite: 2, papel: "todos", cursor: decodificar(primeira.proximoCursor!) });
    expect([...primeira.corridas, ...segunda.corridas].map((c) => c.id)).toEqual(cs.map((c) => c.id).sort().reverse());
    expect(segunda.proximoCursor).toBeNull();
    expect((await consultas.historico(a.passageiroId, { limite: 20, papel: "todos", status: "CANCELADA" })).corridas).toHaveLength(1);
  });
  it("prestador rejeitado ainda pode consultar seu próprio histórico", async () => {
    const m = await motorista("REJEITADO");
    const c = await corrida("FINALIZADA");
    await banco.corrida.update({ where: { id: c.id }, data: { prestadorId: m.prestadorId } });
    expect((await consultas.historico(m.usuarioId, { limite: 20, papel: "prestador" })).corridas.map((x) => x.id)).toEqual([c.id]);
  });
  it.each(["PENDENTE", "REJEITADO"] as const)("ofertas bloqueadas para %s", async (status) => {
    const m = await motorista(status);
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("ofertas exigem conta ativa e veículo próprio", async () => {
    const m = await motorista();
    const outro = await motorista();
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: outro.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
    await banco.usuario.update({ where: { id: m.usuarioId }, data: { ativo: false } });
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("prestador ocupado não recebe ofertas", async () => {
    const m = await motorista();
    const c = await corrida("EM_ANDAMENTO");
    await banco.corrida.update({ where: { id: c.id }, data: { prestadorId: m.prestadorId } });
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 409 });
  });
  it("ofertas filtram categoria, próprio passageiro e cadastro inativo sem expor identidade", async () => {
    const m = await motorista();
    const tipo = await banco.tipoVeiculo.create({ data: { nome: randomUUID() } });
    const categoria = await banco.categoriaVeiculo.create({ data: { nome: randomUUID(), tipoVeiculoId: tipo.id } });
    await banco.veiculo.update({ where: { id: m.veiculoId }, data: { categoriaVeiculoId: categoria.id } });
    const elegivel = await corrida();
    const propria = await corrida("SOLICITADA", m.usuarioId);
    const inativa = await corrida();
    await banco.usuario.update({ where: { id: inativa.passageiroId }, data: { ativo: false } });
    await banco.corrida.updateMany({ where: { id: { in: [elegivel.id, propria.id, inativa.id] } }, data: { categoriaVeiculoId: categoria.id, origemLatitude: "-16.1234567" } });
    const ofertas = await consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 });
    expect(ofertas.corridas.map((c) => c.id)).toEqual([elegivel.id]);
    expect(Object.keys(ofertas.corridas[0]).sort()).toEqual(["id", "status", "categoriaVeiculoId", "distanciaKm", "valorTotal", "createdAt", "origemAproximada", "destinoAproximado"].sort());
    expect(ofertas.corridas[0].origemAproximada.latitude).toBe(-16.12);
    await banco.veiculo.update({ where: { id: m.veiculoId }, data: { ativo: false } });
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
    await banco.veiculo.update({ where: { id: m.veiculoId }, data: { ativo: true } });
    await banco.categoriaVeiculo.update({ where: { id: categoria.id }, data: { ativo: false } });
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
    await banco.categoriaVeiculo.update({ where: { id: categoria.id }, data: { ativo: true } });
    await banco.tipoVeiculo.update({ where: { id: tipo.id }, data: { ativo: false } });
    await expect(consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("ofertas paginam por data e ID ascendentes sem incluir encerradas ou atribuídas", async () => {
    const m = await motorista();
    const tipo = await banco.tipoVeiculo.create({ data: { nome: randomUUID() } });
    const categoria = await banco.categoriaVeiculo.create({ data: { nome: randomUUID(), tipoVeiculoId: tipo.id } });
    await banco.veiculo.update({ where: { id: m.veiculoId }, data: { categoriaVeiculoId: categoria.id } });
    const cs = await Promise.all([corrida(), corrida(), corrida()]);
    const encerrada = await corrida("CANCELADA");
    const atribuida = await corrida("ACEITA");
    await banco.corrida.updateMany({ where: { id: { in: [...cs.map((c) => c.id), encerrada.id, atribuida.id] } },
      data: { categoriaVeiculoId: categoria.id, createdAt: new Date("2026-01-01") } });
    const primeira = await consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 2 });
    const segunda = await consultas.disponiveis(m.usuarioId, { veiculoId: m.veiculoId, limite: 2, cursor: decodificar(primeira.proximoCursor!) });
    expect([...primeira.corridas, ...segunda.corridas].map((c) => c.id)).toEqual(cs.map((c) => c.id).sort());
    expect(segunda.proximoCursor).toBeNull();
  });

});
