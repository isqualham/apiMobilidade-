import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { SolicitarCorridaUseCase } from "@/modules/corrida/SolicitarCorridaUseCase";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrismaTarifaCategoriaRepository } from "@/modules/tarifa/PrismaTarifaCategoriaRepository";
import { PrismaCategoriaVeiculoRepository } from "@/modules/categoria-veiculo/PrismaCategoriaVeiculoRepository";
import { OsrmRotasService } from "@/modules/corrida/OsrmRotasService";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { executarSeed } from "../../scripts/seed/executar";
import { contasSeed, veiculosSeed, idSeed } from "../../scripts/seed/dados";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as veiculos } from "@/app/api/veiculos/route";
import { GET as ofertas } from "@/app/api/corrida/disponiveis/route";
import { calcularValorCorrida } from "@/modules/corrida/CalcularValorCorrida";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Defina TEST_DATABASE_URL para PostgreSQL isolado.");
const admin = new Client({ connectionString: url });
let banco: PrismaClient;
let schema: string;
let categorias: { moto: string; economico: string; conforto: string };
const senha = "teste1234";
const env = { NODE_ENV: "development", VIAU_ENVIRONMENT: "development", VIAU_SEED_CONFIRM: "desenvolvimento", DATABASE_URL: url };
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get(_target, key) {
  const valor = banco[key as keyof PrismaClient];
  return typeof valor === "function" ? valor.bind(banco) : valor;
} }) }));
beforeAll(async () => { await admin.connect(); vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex")); });
beforeEach(async () => {
  schema = `test_seed_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`); await admin.query(`SET search_path TO "${schema}"`);
  const diretorio = new URL("../../prisma/migrations/", import.meta.url);
  for (const pasta of readdirSync(diretorio, { withFileTypes: true }).filter(p => p.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
    await admin.query(readFileSync(new URL(`${pasta.name}/migration.sql`, diretorio), "utf8"));
  }
  banco = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, { schema }) });
  await banco.termoUso.create({ data: { versao: "fixture", conteudo: "Somente teste", ativo: true } });
  await banco.politicaPrivacidade.create({ data: { versao: "fixture", conteudo: "Somente teste", ativo: true } });
  const moto = await banco.tipoVeiculo.create({ data: { nome: "Moto" } });
  const carro = await banco.tipoVeiculo.create({ data: { nome: "Carro" } });
  // Categorias são fixtures do teste, não categorias presumidas no desenvolvimento.
  categorias = {
    moto: (await banco.categoriaVeiculo.create({ data: { nome: "Moto Fixture", tipoVeiculoId: moto.id } })).id,
    economico: (await banco.categoriaVeiculo.create({ data: { nome: "Econômico Fixture", tipoVeiculoId: carro.id } })).id,
    conforto: (await banco.categoriaVeiculo.create({ data: { nome: "Conforto Fixture", tipoVeiculoId: carro.id } })).id,
  };
});
afterEach(async () => { await banco?.$disconnect(); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); });
afterAll(async () => { await admin.end(); vi.unstubAllEnvs(); });
const executar = () => executarSeed(banco, { env, senha, categorias });

it("seed idempotente não muda registros, não cria corridas e prepara login/veículos", async () => {
  const primeiro = await executar();
  const antes = await banco.usuario.findMany({ orderBy: { id: "asc" } });
  const tarifasAntes = await banco.tarifaCategoria.findMany({ orderBy: { id: "asc" } });
  await executar();
  expect(await banco.usuario.findMany({ orderBy: { id: "asc" } })).toEqual(antes);
  expect(await banco.tarifaCategoria.findMany({ orderBy: { id: "asc" } })).toEqual(tarifasAntes);
  expect(await banco.usuario.count()).toBe(4);
  expect(await banco.prestador.count({ where: { statusAprovacao: "APROVADO" } })).toBe(2);
  expect(await banco.veiculo.count()).toBe(2);
  expect(await banco.corrida.count()).toBe(0);
  expect(await banco.aceiteTermoUso.count()).toBe(4);
  expect(await banco.aceitePoliticaPrivacidade.count()).toBe(4);
  expect(antes.every(u => u.senhaHash.startsWith("$2") && u.senhaHash !== senha && !u.administrador)).toBe(true);
  expect(primeiro.tarifas.map(t => calcularValorCorrida(1000, { valorKm: Number(t.valorKm), tarifaMinima: Number(t.tarifaMinima), taxaPartida: Number(t.taxaPartida) }).valorTotal)).toEqual(["7.00", "10.00", "15.00", "20.00"]);
  for (const conta of contasSeed) {
    const resposta = await login(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email: conta.email, senha }) }));
    expect(resposta.status).toBe(200);
    const body = await resposta.json();
    expect(body.id).toBe(conta.id);
    const headers = { Authorization: `Bearer ${body.token}` };
    const proprio = veiculosSeed.find(v => v.usuarioId === conta.id);
    const lista = await veiculos(new NextRequest("http://localhost/api/veiculos", { headers }));
    expect(lista.status).toBe(proprio ? 200 : 403);
    if (proprio) {
      expect((await lista.json()).veiculos).toHaveLength(1);
      // Aprovação explícita da fixture; a seed permanece sem aprovar veículos.
      await banco.veiculo.update({ where: { id: proprio.id }, data: { statusAprovacao: "APROVADO" } });
      await new PrismaDisponibilidadePrestadorRepository(banco).alterar(conta.id, { status: "ONLINE", veiculoId: proprio.id, versao: 0 });
      const disponiveis = await ofertas(new Request(`http://localhost/api/corrida/disponiveis?veiculoId=${proprio.id}`, { headers }));
      expect(disponiveis.status).toBe(200);
    }
  }
});
it.each(["email", "cpf", "telefone"] as const)("conflito externo de %s reverte toda a seed", async campo => {
  const conta = contasSeed[0];
  const externo = await banco.usuario.create({ data: {
    nome: "Externo", cpf: "12345678909", email: "externo@example.invalid", telefone: "+5565991111111", senhaHash: "nao-modificar", [campo]: conta[campo],
  } });
  await expect(executar()).rejects.toThrow("Conflito");
  expect(await banco.usuario.findMany()).toEqual([externo]);
  expect(await banco.tarifaCategoria.count()).toBe(0);
});
it("preserva integralmente tarifa externa existente", async () => {
  const tarifa = await banco.tarifaCategoria.create({ data: { categoriaVeiculoId: categorias.moto, valorKm: "9.90", tarifaMinima: "20.00", taxaPartida: "1.00" } });
  const resumo = await executar();
  expect(await banco.tarifaCategoria.findUnique({ where: { id: tarifa.id } })).toEqual(tarifa);
  expect(resumo.tarifas[0]).toMatchObject({ preservada: true, valorKm: "9.90", tarifaMinima: "20.00", taxaPartida: "1.00" });
});
it("conflito de placa externa não altera usuário, prestador ou veículo", async () => {
  const usuario = await banco.usuario.create({ data: { nome: "Externo", cpf: "12345678909", email: "externo@example.invalid", senhaHash: "preservar" } });
  const prestador = await banco.prestador.create({ data: { usuarioId: usuario.id, statusAprovacao: "APROVADO" } });
  const veiculo = await banco.veiculo.create({ data: { prestadorId: prestador.id, categoriaVeiculoId: categorias.moto, placa: veiculosSeed[0].placa, marca: "Externo", modelo: "Externo", ano: 2024 } });
  await expect(executar()).rejects.toThrow("Conflito de veículo");
  expect(await banco.usuario.count()).toBe(1); expect(await banco.veiculo.findMany()).toEqual([veiculo]);
});
it("categorias ausentes não são criadas e nada é confirmado", async () => {
  await expect(executarSeed(banco, { env, senha, categorias: { moto: randomUUID(), economico: randomUUID() } })).rejects.toThrow("inexistente");
  expect(await banco.usuario.count()).toBe(0); expect(await banco.categoriaVeiculo.count()).toBe(3);
});
it("bloqueio de produção acontece antes de qualquer escrita", async () => {
  await expect(executarSeed(banco, { env: { ...env, NODE_ENV: "production" }, senha, categorias })).rejects.toThrow("somente");
  expect(await banco.usuario.count()).toBe(0); expect(await banco.tarifaCategoria.count()).toBe(0);
});
it("não reaprova ou redefine conta modificada em reexecução", async () => {
  await executar();
  await banco.prestador.update({ where: { id: veiculosSeed[0].prestadorId }, data: { statusAprovacao: "REJEITADO" } });
  await expect(executar()).rejects.toThrow("aprovação alterada");
  expect((await banco.prestador.findUniqueOrThrow({ where: { id: veiculosSeed[0].prestadorId } })).statusAprovacao).toBe("REJEITADO");
});

it("cria quatro categorias oficiais sem alterar categorias customizadas", async () => {
  const antes = await banco.categoriaVeiculo.findMany({ orderBy: { id: "asc" } });
  await executarSeed(banco, { env, senha, categorias: {} });
  await executarSeed(banco, { env, senha, categorias: {} });
  expect(await banco.categoriaVeiculo.count()).toBe(7);
  expect(await banco.categoriaVeiculo.findMany({ where: { id: { in: antes.map(c => c.id) } }, orderBy: { id: "asc" } })).toEqual(antes);
  expect(await banco.categoriaVeiculo.findUnique({ where: { nome: "Conforto" } })).toBeNull();
  expect(await banco.tarifaCategoria.count()).toBe(4);
});
it("não apaga corrida ativa preexistente das contas de teste", async () => {
  await executar();
  const corrida = await banco.corrida.create({ data: {
    passageiroId: contasSeed[0].id, categoriaVeiculoId: categorias.moto,
    origemEndereco: "Origem", destinoEndereco: "Destino", origemLatitude: -16, origemLongitude: -57,
    destinoLatitude: -16.1, destinoLongitude: -57.1, distanciaKm: 1, valorKmAplicado: 1.8, valorTotal: 4.8,
  } });
  expect((await executar()).corridasAtivasExistentes).toBe(1);
  expect(await banco.corrida.findUnique({ where: { id: corrida.id } })).toEqual(corrida);
});

it("reutiliza aliases antigos, preserva IDs e não duplica ao padronizar nomes", async () => {
  for (const [papel, nome] of [["moto", "Moto"], ["economico", "Economico"], ["conforto", "Conforto"]] as const) {
    await banco.categoriaVeiculo.update({ where: { id: categorias[papel] }, data: { nome } });
  }
  const tarifa = await banco.tarifaCategoria.create({ data: { categoriaVeiculoId: categorias.moto, valorKm: "9.00", tarifaMinima: "20.00", taxaPartida: "1.00" } });
  await executarSeed(banco, { env, senha, categorias: {} });
  const resultado = await executarSeed(banco, { env, senha, categorias: {} });
  expect(await banco.categoriaVeiculo.count()).toBe(4);
  expect((await banco.categoriaVeiculo.findUniqueOrThrow({ where: { id: categorias.moto } })).nome).toBe("Moto");
  expect((await banco.veiculo.findUniqueOrThrow({ where: { id: veiculosSeed[0].id } })).categoriaVeiculoId).toBe(categorias.moto);
  expect(await banco.tarifaCategoria.findUnique({ where: { id: tarifa.id } })).toEqual(tarifa);
  expect(resultado.categorias.every(c => c.acao === "preservada")).toBe(true);
});
it("aliases duplicados interrompem sem fundir ou apagar relacionamentos", async () => {
  const tipo = await banco.tipoVeiculo.findUniqueOrThrow({ where: { nome: "Moto" } });
  for (const nome of ["Moto", "ViaU Moto"]) await banco.categoriaVeiculo.create({ data: { nome, tipoVeiculoId: tipo.id } });
  await expect(executarSeed(banco, { env, senha, categorias: {} })).rejects.toThrow("ambíguas");
  expect(await banco.usuario.count()).toBe(0);
});
it("tarifa da seed não muda automaticamente; atualização exige snapshot explícito", async () => {
  await executar();
  await banco.tarifaCategoria.update({ where: { id: idSeed(31) }, data: { tarifaMinima: "3.00" } });
  const antes = await banco.tarifaCategoria.findUniqueOrThrow({ where: { id: idSeed(31) } });
  await executar();
  expect(await banco.tarifaCategoria.findUnique({ where: { id: antes.id } })).toEqual(antes);
  const permissao = { id: antes.id, categoriaVeiculoId: antes.categoriaVeiculoId, updatedAt: antes.updatedAt.toISOString(), valorKm: antes.valorKm.toFixed(2), tarifaMinima: antes.tarifaMinima.toFixed(2), taxaPartida: antes.taxaPartida.toFixed(2) };
  const autorizado = { ...env, VIAU_SEED_TARIFAS_ATUALIZAR: JSON.stringify([permissao]) };
  const resultado = await executarSeed(banco, { env: autorizado, senha, categorias });
  expect(resultado.tarifas[0]).toMatchObject({ id: antes.id, acao: "atualizada", tarifaMinima: "7.00" });
  const depois = await banco.tarifaCategoria.findUniqueOrThrow({ where: { id: antes.id } });
  await executarSeed(banco, { env: autorizado, senha, categorias });
  expect(await banco.tarifaCategoria.findUnique({ where: { id: antes.id } })).toEqual(depois);
});
it("snapshot antigo e autorização de tarifa externa não permitem sobrescrita", async () => {
  await executar();
  const original = await banco.tarifaCategoria.findUniqueOrThrow({ where: { id: idSeed(31) } });
  const permissao = { id: original.id, categoriaVeiculoId: original.categoriaVeiculoId, updatedAt: original.updatedAt.toISOString(), valorKm: "1.80", tarifaMinima: "7.00", taxaPartida: "3.00" };
  await banco.tarifaCategoria.update({ where: { id: original.id }, data: { valorKm: "6.00" } });
  await expect(executarSeed(banco, { env: { ...env, VIAU_SEED_TARIFAS_ATUALIZAR: JSON.stringify([permissao]) }, senha, categorias })).rejects.toThrow("mudou desde");
  expect((await banco.tarifaCategoria.findUniqueOrThrow({ where: { id: original.id } })).valorKm.toFixed(2)).toBe("6.00");
  await expect(executarSeed(banco, { env: { ...env, VIAU_SEED_TARIFAS_ATUALIZAR: JSON.stringify([{ ...permissao, id: randomUUID() }]) }, senha, categorias })).rejects.toThrow("Autorização");
});
it("categorias Moto/Econômico inativas não são reativadas pela seed", async () => {
  await banco.categoriaVeiculo.update({ where: { id: categorias.moto }, data: { ativo: false } });
  await expect(executar()).rejects.toThrow("inativa");
  expect(await banco.usuario.count()).toBe(0);
});


it("backend real persiste cálculo, aceita, inicia e finaliza com as categorias da seed", async () => {
  await executarSeed(banco, { env, senha, categorias: {} });
  // Somente o provedor externo é controlado; adaptador HTTP, casos de uso e PostgreSQL são reais.
  const servidor = createServer((_req, res) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ code: "Ok", routes: [{ distance: 5005, duration: 600 }] })); });
  await new Promise<void>(resolve => servidor.listen(0, "127.0.0.1", resolve));
  try {
    const repo = new PrismaCorridaRepository(banco);
    const rotas = new OsrmRotasService({ baseUrl: new URL(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}/`), publico: false, profile: "driving", timeoutMs: 5000, intervaloMs: 0, userAgent: "ViaU Teste" });
    const solicitar = new SolicitarCorridaUseCase(repo, new PrismaTarifaCategoriaRepository(), rotas);
    const dados = { passageiroId: contasSeed[0].id, categoriaVeiculoId: idSeed(41), origemEndereco: "Origem", destinoEndereco: "Destino", origemLatitude: -16, origemLongitude: -57, destinoLatitude: -16.1, destinoLongitude: -57.1 };
    for (const categoriaVeiculoId of [randomUUID(), idSeed(43), idSeed(44)]) {
      await expect(solicitar.executar({ ...dados, categoriaVeiculoId })).rejects.toMatchObject({ statusCode: 404 });
    }
    const publicas = await new PrismaCategoriaVeiculoRepository().listarAtivas();
    expect(publicas.some(c => c.id === idSeed(43) || c.id === idSeed(44))).toBe(false);
    const corrida = await solicitar.executar(dados);
    expect(corrida).toMatchObject({ status: "SOLICITADA", distanciaKm: 5.005, valorTotal: 12.01, valorKmAplicado: 1.8 });
    const consulta = await ofertas(new Request("http://localhost/api/corrida/disponiveis?veiculoId=" + veiculosSeed[0].id));
    expect(consulta.status).toBe(401); // Preserva autenticação do endpoint.
    const aceite = { corridaId: corrida.id, usuarioId: contasSeed[2].id, veiculoId: veiculosSeed[0].id };
    await banco.veiculo.update({ where: { id: aceite.veiculoId }, data: { statusAprovacao: "APROVADO" } });
    await new PrismaDisponibilidadePrestadorRepository(banco).alterar(aceite.usuarioId, { status: "ONLINE", veiculoId: aceite.veiculoId, versao: 0 });
    expect((await repo.aceitar(aceite)).status).toBe("ACEITA");
    expect((await repo.iniciar(aceite.corridaId, aceite.usuarioId)).status).toBe("EM_ANDAMENTO");
    expect(await repo.finalizar(aceite.corridaId, aceite.usuarioId)).toMatchObject({ status: "FINALIZADA", valorFinalCobrado: 12.01 });
  } finally { await new Promise<void>((resolve, reject) => servidor.close(e => e ? reject(e) : resolve())); }
});

it("prepara documentos antes dos aceites e preserva conteúdo e datas na reexecução", async () => {
  await banco.termoUso.deleteMany();
  await banco.politicaPrivacidade.deleteMany();
  await executar();
  const termos = await banco.termoUso.findMany();
  const politicas = await banco.politicaPrivacidade.findMany();
  expect(termos).toHaveLength(1);
  expect(politicas).toHaveLength(1);
  expect(termos[0]).toMatchObject({ conteudo: "Termos e condições de uso do ViaU.", versao: "1.0", ativo: true });
  expect(politicas[0]).toMatchObject({ conteudo: "Política de privacidade do ViaU.", versao: "1.0", ativo: true });
  expect(await banco.aceiteTermoUso.count({ where: { termoUsoId: termos[0].id } })).toBe(4);
  expect(await banco.aceitePoliticaPrivacidade.count({ where: { politicaPrivacidadeId: politicas[0].id } })).toBe(4);
  await executar();
  expect(await banco.termoUso.findMany()).toEqual(termos);
  expect(await banco.politicaPrivacidade.findMany()).toEqual(politicas);
});

it("preserva documentos externos integralmente", async () => {
  const termos = await banco.termoUso.findMany();
  const politicas = await banco.politicaPrivacidade.findMany();
  await executar();
  expect(await banco.termoUso.findMany()).toEqual(termos);
  expect(await banco.politicaPrivacidade.findMany()).toEqual(politicas);
});

it("reverte criação dos documentos se outra etapa da seed falhar", async () => {
  await banco.termoUso.deleteMany();
  await banco.politicaPrivacidade.deleteMany();
  await expect(executarSeed(banco, { env, senha, categorias: { moto: randomUUID() } })).rejects.toThrow();
  expect(await banco.termoUso.count()).toBe(0);
  expect(await banco.politicaPrivacidade.count()).toBe(0);
  expect(await banco.usuario.count()).toBe(0);
});

it("não duplica ou reativa documentos existentes inativos", async () => {
  await banco.termoUso.updateMany({ data: { ativo: false } });
  const antes = await banco.termoUso.findMany();
  await expect(executar()).rejects.toThrow("inativo");
  expect(await banco.termoUso.findMany()).toEqual(antes);
  expect(await banco.usuario.count()).toBe(0);
});
