import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
import { PrismaGestaoVeiculoRepository } from "@/modules/veiculo/PrismaGestaoVeiculoRepository";
import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusAprovacaoVeiculo } from "@/generated/prisma/client";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

// Nunca usa DATABASE_URL nem carrega .env. Cada execução cria seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para um PostgreSQL de testes.");
const schema = `test_aprovacao_veiculo_${randomUUID().replaceAll("-", "")}`;
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



const gestao = new PrismaGestaoVeiculoRepository(banco);
const disponibilidade = new PrismaDisponibilidadePrestadorRepository(banco);
const corridas = new PrismaCorridaRepository(banco);
const consultas = new PrismaCorridaConsultaRepository(banco);
async function fixture() {
  const u = await dados();
  const admin = await dados();
  await banco.usuario.update({ where: { id: admin.passageiroId }, data: { administrador: true } });
  const p = await banco.prestador.create({ data: { usuarioId: u.passageiroId, statusAprovacao: "APROVADO" } });
  const v = await banco.veiculo.create({ data: { prestadorId: p.id, categoriaVeiculoId, placa: `ABC${String(contador).padStart(4, "0")}`, marca: "Marca", modelo: "Modelo", ano: 2024 } });
  return { usuario: u.passageiroId, admin: admin.passageiroId, p, v };
}
it("veículo sem imagem inicia pendente e decisão registra motivo, autor e versão", async () => {
  const f = await fixture();
  expect(f.v).toMatchObject({ statusAprovacao: "PENDENTE", versao: 0, imagemUrl: null, ativo: true });
  const aprovado = await gestao.decidir(f.admin, f.v.id, { statusAprovacao: "APROVADO", motivo: "Documentação conferida", versao: 0 });
  expect(aprovado.statusAprovacao).toBe("APROVADO");
  const historico = await gestao.historico(f.admin, f.v.id, { limite: 20 });
  expect(historico.itens).toHaveLength(1);
  expect(historico.itens[0]).toMatchObject({ autorId: f.admin, motivo: "Documentação conferida", statusAnterior: "PENDENTE", statusNovo: "APROVADO", versao: 1 });
  expect((await gestao.listar(f.admin, { status: "APROVADO", limite: 50 })).itens.some(v => v.id === f.v.id)).toBe(true);
});
it.each<StatusAprovacaoVeiculo>(["PENDENTE", "REJEITADO", "SUSPENSO"])("%s não fica Online, consulta ofertas nem aceita", async statusAprovacao => {
  const f = await fixture();
  await banco.veiculo.update({ where: { id: f.v.id }, data: { statusAprovacao } });
  await expect(disponibilidade.alterar(f.usuario, { status: "ONLINE", veiculoId: f.v.id, versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
  // Simula seleção antiga para comprovar revalidação independente de Online.
  await banco.prestador.update({ where: { id: f.p.id }, data: { veiculoOnlineId: f.v.id } });
  await expect(consultas.disponiveis(f.usuario, { veiculoId: f.v.id, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  await expect(corridas.aceitar({ usuarioId: f.usuario, veiculoId: f.v.id, corridaId: randomUUID() })).rejects.toMatchObject({ statusCode: 403 });
});
it("suspensão retira Online e preserva corrida em andamento até finalizar", async () => {
  const f = await fixture();
  await gestao.decidir(f.admin, f.v.id, { statusAprovacao: "APROVADO", motivo: "Dados conferidos", versao: 0 });
  await disponibilidade.alterar(f.usuario, { status: "ONLINE", veiculoId: f.v.id, versao: 0 });
  const c = await corridas.criar(await dados());
  await corridas.aceitar({ usuarioId: f.usuario, veiculoId: f.v.id, corridaId: c.id });
  await corridas.iniciar(c.id, f.usuario);
  await expect(gestao.editar(f.usuario, f.v.id, { versao: 1, marca: "Outra" })).rejects.toMatchObject({ statusCode: 409 });
  await gestao.decidir(f.admin, f.v.id, { statusAprovacao: "SUSPENSO", motivo: "Verificação adicional necessária", versao: 1 });
  expect((await disponibilidade.consultar(f.usuario)).status).toBe("OFFLINE");
  expect((await banco.corrida.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("EM_ANDAMENTO");
  expect((await corridas.finalizar(c.id, f.usuario)).status).toBe("FINALIZADA");
  expect((await gestao.editar(f.usuario, f.v.id, { versao: 2, marca: "Outra" })).statusAprovacao).toBe("SUSPENSO");
});
it("alteração relevante revoga aprovação e seleção Online com histórico", async () => {
  const f = await fixture();
  await gestao.decidir(f.admin, f.v.id, { statusAprovacao: "APROVADO", motivo: "Dados conferidos", versao: 0 });
  await disponibilidade.alterar(f.usuario, { status: "ONLINE", veiculoId: f.v.id, versao: 0 });
  const novo = await gestao.editar(f.usuario, f.v.id, { versao: 1, modelo: "Outro modelo" });
  expect(novo.statusAprovacao).toBe("PENDENTE");
  expect((await disponibilidade.consultar(f.usuario)).status).toBe("OFFLINE");
  expect(await banco.auditoriaVeiculo.count({ where: { veiculoId: f.v.id } })).toBe(2);
});
it("duas decisões simultâneas não se sobrescrevem e geram somente um evento", async () => {
  const f = await fixture();
  const resultados = await Promise.allSettled([
    gestao.decidir(f.admin, f.v.id, { statusAprovacao: "APROVADO", motivo: "Dados conferidos", versao: 0 }),
    gestao.decidir(f.admin, f.v.id, { statusAprovacao: "REJEITADO", motivo: "Dados inconsistentes", versao: 0 }),
  ]);
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(resultados.find(r => r.status === "rejected")).toMatchObject({ reason: { statusCode: 409 } });
  expect(await banco.auditoriaVeiculo.count({ where: { veiculoId: f.v.id } })).toBe(1);
});
it("edição concorrente com aprovação não aprova dados que não foram revisados", async () => {
  const f = await fixture();
  const resultados = await Promise.allSettled([
    gestao.decidir(f.admin, f.v.id, { statusAprovacao: "APROVADO", motivo: "Dados conferidos", versao: 0 }),
    gestao.editar(f.usuario, f.v.id, { versao: 0, marca: "Nova marca" }),
  ]);
  expect(resultados.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const atual = await banco.veiculo.findUniqueOrThrow({ where: { id: f.v.id } });
  if (atual.statusAprovacao === "APROVADO") expect(atual.marca).toBe(f.v.marca);
  else expect(atual.statusAprovacao).toBe("PENDENTE");
});
it("usuário comum não decide e proprietário não altera veículo de terceiros", async () => {
  const f = await fixture();
  const outro = await fixture();
  await expect(gestao.decidir(f.usuario, f.v.id, { statusAprovacao: "APROVADO", motivo: "Tentativa indevida", versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
  await expect(gestao.editar(outro.usuario, f.v.id, { versao: 0, ativo: false })).rejects.toMatchObject({ statusCode: 404 });
  expect(await banco.auditoriaVeiculo.count({ where: { veiculoId: f.v.id } })).toBe(0);
});
