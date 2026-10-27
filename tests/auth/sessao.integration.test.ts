import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";
import { SignJWT } from "jose";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { autenticarRequisicao } from "@/modules/auth/AutenticarRequisicao";
import { gerarToken, verificarToken } from "@/modules/auth/TokenService";
import { hashRefresh } from "@/modules/auth/SessaoUseCase";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";

// Apenas TEST_DATABASE_URL; cada execução cria e remove seu próprio schema.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina TEST_DATABASE_URL para PostgreSQL isolado.");
const schema = `test_refresh_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString });
const banco = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, {
  get(_target, key) {
    const value = banco[key as keyof PrismaClient];
    return typeof value === "function" ? value.bind(banco) : value;
  },
}) }));
let conectado = false;
let contador = 0;
let usuario: { id: string; nome: string; email: string; administrador: boolean };
let senhaHash: string;
const senha = "SenhaSomenteTeste123!";
function request(corpo: unknown) {
  return new Request("http://localhost/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
}
async function entrar() {
  const resposta = await login(request({ email: usuario.email, senha }));
  expect(resposta.status).toBe(200);
  return resposta.json() as Promise<{ token: string; refreshToken: string }>;
}
function protegida(token: string) {
  return autenticarRequisicao(new Request("http://localhost/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }));
}
beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  senhaHash = await hash(senha, 4);
  await admin.connect(); conectado = true;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`SET search_path TO "${schema}"`);
  const diretorio = new URL("../../prisma/migrations/", import.meta.url);
  for (const pasta of readdirSync(diretorio, { withFileTypes: true }).filter(p => p.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
    await admin.query(readFileSync(new URL(`${pasta.name}/migration.sql`, diretorio), "utf8"));
  }
});
beforeEach(async () => {
  usuario = await banco.usuario.create({ data: {
    nome: "Teste sessão", cpf: String(++contador).padStart(11, "0"), email: `${randomUUID()}@test.invalid`, senhaHash,
  } });
});
afterAll(async () => {
  await banco.$disconnect();
  if (conectado) await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.end(); vi.unstubAllEnvs();
});

it("login preserva contrato, emite JWT de 1h e persiste somente hash com validade de 7 dias", async () => {
  const resposta = await login(request({ email: usuario.email, senha }));
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  const body = await resposta.json();
  expect(Object.keys(body).sort()).toEqual(["id", "nome", "email", "administrador", "prestador", "statusAprovacao", "telefoneVerificado", "token", "refreshToken"].sort());
  expect(body.id).toBe(usuario.id);
  const jwt = await verificarToken(body.token);
  expect(jwt.sub).toBe(usuario.id);
  expect(jwt.exp! - jwt.iat!).toBe(3600);
  const registro = await banco.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashRefresh(body.refreshToken) }, include: { sessao: true } });
  expect(registro.tokenHash).not.toBe(body.refreshToken);
  expect(JSON.stringify(registro)).not.toContain(body.refreshToken);
  expect(registro.sessao.id).toBe(jwt.sid);
  expect(registro.sessao.usuarioId).toBe(usuario.id);
  expect(registro.expiraEm.getTime() - Date.now()).toBeGreaterThan(7 * 86400000 - 10000);
  expect(registro.expiraEm.getTime() - Date.now()).toBeLessThanOrEqual(7 * 86400000);
  expect(await protegida(body.token)).toMatchObject({ id: usuario.id });
});
it("renova com access expirado, preserva identidade e lê permissões atuais do banco", async () => {
  const inicial = await entrar();
  const payload = await verificarToken(inicial.token);
  const expirado = await new SignJWT({ sid: payload.sid }).setProtectedHeader({ alg: "HS256" }).setSubject(usuario.id)
    .setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET));
  await expect(protegida(expirado)).rejects.toThrow("Token ausente ou inválido.");
  await banco.usuario.update({ where: { id: usuario.id }, data: { administrador: true } });
  const resposta = await refresh(request({ refreshToken: inicial.refreshToken }));
  expect(resposta.status).toBe(200);
  const novo = await resposta.json();
  expect(Object.keys(novo).sort()).toEqual(["refreshToken", "token"]);
  expect(novo.refreshToken).not.toBe(inicial.refreshToken);
  expect(await verificarToken(novo.token)).toMatchObject({ sub: usuario.id, sid: payload.sid, administrador: true });
  expect(await protegida(novo.token)).toMatchObject({ id: usuario.id, administrador: true });
  expect(await banco.refreshToken.count({ where: { sessaoId: payload.sid as string } })).toBe(2);
});
it("refresh expirado é rejeitado e revoga sessão", async () => {
  const tokens = await entrar();
  await banco.refreshToken.update({ where: { tokenHash: hashRefresh(tokens.refreshToken) }, data: { expiraEm: new Date(0) } });
  expect((await refresh(request({ refreshToken: tokens.refreshToken }))).status).toBe(401);
  await expect(protegida(tokens.token)).rejects.toThrow();
});
it("reutilização revoga toda a família e não revoga outro login", async () => {
  const inicial = await entrar(); const outra = await entrar();
  const novo = await (await refresh(request({ refreshToken: inicial.refreshToken }))).json();
  expect((await refresh(request({ refreshToken: inicial.refreshToken }))).status).toBe(401);
  expect((await refresh(request({ refreshToken: novo.refreshToken }))).status).toBe(401);
  await expect(protegida(novo.token)).rejects.toThrow();
  expect((await refresh(request({ refreshToken: outra.refreshToken }))).status).toBe(200);
});
it("duas renovações simultâneas: uma vence, replay revoga inclusive o token vencedor", async () => {
  const inicial = await entrar();
  const respostas = await Promise.all([refresh(request({ refreshToken: inicial.refreshToken })), refresh(request({ refreshToken: inicial.refreshToken }))]);
  expect(respostas.map(r => r.status).sort()).toEqual([200, 401]);
  const novo = await respostas.find(r => r.status === 200)!.json();
  expect((await refresh(request({ refreshToken: novo.refreshToken }))).status).toBe(401);
  await expect(protegida(novo.token)).rejects.toThrow();
  const antigo = await banco.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashRefresh(inicial.refreshToken) }, include: { sessao: true } });
  expect(antigo.sessao.revogadaEm).not.toBeNull();
  expect(await banco.refreshToken.count({ where: { sessaoId: antigo.sessaoId } })).toBe(2);
});
it("usuário inativo não renova mesmo com token válido", async () => {
  const tokens = await entrar();
  await banco.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
  expect((await refresh(request({ refreshToken: tokens.refreshToken }))).status).toBe(401);
  await expect(protegida(tokens.token)).rejects.toThrow();
});
it("logout idempotente revoga refresh e access, inclusive quando recebe token antigo", async () => {
  const inicial = await entrar();
  const novo = await (await refresh(request({ refreshToken: inicial.refreshToken }))).json();
  for (let i = 0; i < 2; i++) expect((await logout(request({ refreshToken: inicial.refreshToken }))).status).toBe(204);
  expect((await refresh(request({ refreshToken: novo.refreshToken }))).status).toBe(401);
  await expect(protegida(novo.token)).rejects.toThrow();
});
it("logout concorrente com refresh nunca deixa sessão utilizável", async () => {
  const tokens = await entrar();
  const [renovacao, saida] = await Promise.all([refresh(request({ refreshToken: tokens.refreshToken })), logout(request({ refreshToken: tokens.refreshToken }))]);
  expect(saida.status).toBe(204);
  expect([200, 401]).toContain(renovacao.status);
  if (renovacao.status === 200) {
    const novo = await renovacao.json();
    expect((await refresh(request({ refreshToken: novo.refreshToken }))).status).toBe(401);
  }
  await expect(protegida(tokens.token)).rejects.toThrow();
});
it("JWT legado continua válido; expirado continua rejeitado", async () => {
  const token = await gerarToken({ ...usuario, sub: usuario.id });
  expect(await protegida(token)).toMatchObject({ id: usuario.id });
});
it("token desconhecido retorna 401 sem criar sessão; logout desconhecido é idempotente", async () => {
  const body = { refreshToken: randomBytes(32).toString("base64url") };
  expect((await refresh(request(body))).status).toBe(401);
  expect((await logout(request(body))).status).toBe(204);
  expect(await banco.sessaoAuth.count({ where: { usuarioId: usuario.id } })).toBe(0);
});
it("revogar sessão não altera corrida e novo login permite recuperar a corrida ativa", async () => {
  const tipo = await banco.tipoVeiculo.create({ data: { nome: randomUUID() } });
  const categoria = await banco.categoriaVeiculo.create({ data: { nome: randomUUID(), tipoVeiculoId: tipo.id } });
  const corrida = await banco.corrida.create({ data: {
    passageiroId: usuario.id, categoriaVeiculoId: categoria.id, status: "EM_ANDAMENTO", dataInicio: new Date(),
    origemEndereco: "Origem", destinoEndereco: "Destino", origemLatitude: -16, origemLongitude: -57,
    destinoLatitude: -16.1, destinoLongitude: -57.1, distanciaKm: 1, valorKmAplicado: 1, valorTotal: 1,
  } });
  const tokens = await entrar();
  await logout(request({ refreshToken: tokens.refreshToken }));
  const novo = await entrar();
  const identidade = await protegida(novo.token);
  expect(identidade.id).toBe(usuario.id);
  expect(await banco.corrida.findUnique({ where: { id: corrida.id } })).toEqual(corrida);
  const consultas = new PrismaCorridaConsultaRepository(banco);
  expect(await consultas.ativa(identidade.id, "passageiro")).toMatchObject({ id: corrida.id, status: "EM_ANDAMENTO" });
});

it("login inválido/inativo preserva 401/403 sem criar sessões", async () => {
  expect((await login(request({ email: usuario.email, senha: "SenhaIncorreta123!" }))).status).toBe(401);
  await banco.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
  expect((await login(request({ email: usuario.email, senha }))).status).toBe(403);
  expect(await banco.sessaoAuth.count({ where: { usuarioId: usuario.id } })).toBe(0);
});
it("sessão expirada bloqueia refresh e access mesmo com token ainda válido", async () => {
  const tokens = await entrar();
  const payload = await verificarToken(tokens.token);
  await banco.sessaoAuth.update({ where: { id: payload.sid as string }, data: { expiraEm: new Date(0) } });
  await expect(protegida(tokens.token)).rejects.toThrow();
  expect((await refresh(request({ refreshToken: tokens.refreshToken }))).status).toBe(401);
});
it("JWT assinado com sessão de outro usuário ou sid inválido é recusado", async () => {
  const tokens = await entrar();
  const payload = await verificarToken(tokens.token);
  const outraPessoa = await banco.usuario.create({ data: {
    nome: "Outro", cpf: String(++contador).padStart(11, "0"), email: `${randomUUID()}@test.invalid`, senhaHash,
  } });
  const trocado = await gerarToken({ ...usuario, sub: outraPessoa.id, sid: payload.sid as string });
  await expect(protegida(trocado)).rejects.toThrow("Token ausente ou inválido.");
  const malformado = await gerarToken({ ...usuario, sub: usuario.id, sid: "invalido" });
  await expect(protegida(malformado)).rejects.toThrow("Token ausente ou inválido.");
});

it("login por telefone exato mantém identidade, permissões e renovação", async () => {
  const telefone = "+5565990000001";
  await banco.usuario.update({ where: { id: usuario.id }, data: { telefone } });
  const resposta = await login(request({ telefone, senha }));
  expect(resposta.status).toBe(200);
  const corpo = await resposta.json();
  expect(corpo).toMatchObject({ id: usuario.id, email: usuario.email, administrador: false, prestador: false });
  expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  expect(await protegida(corpo.token)).toMatchObject({ id: usuario.id });
  const renovada = await refresh(request({ refreshToken: corpo.refreshToken }));
  expect(renovada.status).toBe(200);
  expect(await verificarToken((await renovada.json()).token)).toMatchObject({ sub: usuario.id });
  const sessoesAntes = await banco.sessaoAuth.count();
  expect((await login(request({ telefone, senha: "senhaErrada123" }))).status).toBe(401);
  expect((await login(request({ telefone: "+5565990000099", senha }))).status).toBe(401);
  expect((await login(request({ telefone: "65990000001", senha }))).status).toBe(400);
  expect((await login(request({ telefone, email: usuario.email, senha }))).status).toBe(400);
  await banco.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
  expect((await login(request({ telefone, senha }))).status).toBe(403);
  expect(await banco.sessaoAuth.count()).toBe(sessoesAntes);
});
