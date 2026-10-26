import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaPrestadorRepository } from "@/modules/prestador/PrismaPrestadorRepository";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrestadorError } from "@/modules/prestador/AtualizarAprovacaoPrestadorDTO";
import { PATCH } from "@/app/api/prestadores/[id]/aprovacao/route";
import { POST as aceitar } from "@/app/api/corrida/[id]/aceitar/route";

vi.mock("@/lib/prisma", () => ({ prisma: { usuario: { findUnique: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const adminId = "00000000-0000-4000-8000-000000000002";
const contexto = { params: Promise.resolve({ id }) };
const usuario = { id: adminId, nome: "Teste", email: "teste@test.invalid", ativo: true, administrador: true, telefoneVerificado: true, prestador: null };
let decidir: MockInstance<PrismaPrestadorRepository["decidirAprovacao"]>;

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  vi.mocked(prisma.usuario.findUnique).mockReset().mockResolvedValue(usuario as never);
  decidir = vi.spyOn(PrismaPrestadorRepository.prototype, "decidirAprovacao").mockResolvedValue({
    id, usuarioId: id, statusAprovacao: "APROVADO", updatedAt: new Date(),
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function token(administrador = true) {
  return gerarToken({ sub: adminId, nome: "Teste", email: "teste@test.invalid", administrador });
}
function request(bearer?: string, corpo = JSON.stringify({ statusAprovacao: "APROVADO" })) {
  return new Request("http://localhost/api/prestadores/id/aprovacao", {
    method: "PATCH", headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: corpo,
  });
}

it.each([undefined, "token-invalido"])("retorna 401 com token ausente/inválido", async (bearer) => {
  expect((await PATCH(request(bearer), contexto)).status).toBe(401);
  expect(decidir).not.toHaveBeenCalled();
});
it("retorna 401 com token expirado", async () => {
  const expirado = await new SignJWT({ administrador: true }).setProtectedHeader({ alg: "HS256" }).setSubject(adminId)
    .setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET));
  expect((await PATCH(request(expirado), contexto)).status).toBe(401);
  expect(decidir).not.toHaveBeenCalled();
});
it("retorna 401 se usuário está inativo", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ ...usuario, ativo: false } as never);
  expect((await PATCH(request(await token()), contexto)).status).toBe(401);
  expect(decidir).not.toHaveBeenCalled();
});
it("retorna 401 se usuário não existe mais", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
  expect((await PATCH(request(await token()), contexto)).status).toBe(401);
});
it("ignora privilégio do JWT e do corpo quando o banco não autoriza", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ ...usuario, administrador: false } as never);
  expect((await PATCH(request(await token(true), JSON.stringify({ statusAprovacao: "APROVADO", administrador: true })), contexto)).status).toBe(403);
  expect(decidir).not.toHaveBeenCalled();
});
it("usa autorização atual do banco e identidade autenticada", async () => {
  const resposta = await PATCH(request(await token(false)), contexto);
  expect(resposta.status).toBe(200);
  expect(decidir).toHaveBeenCalledWith({ prestadorId: id, administradorId: adminId, statusAprovacao: "APROVADO" });
  const json = await resposta.json();
  expect(Object.keys(json.prestador).sort()).toEqual(["id", "statusAprovacao", "updatedAt", "usuarioId"]);
});
it.each(["{", JSON.stringify({ statusAprovacao: "PENDENTE" }), JSON.stringify({ statusAprovacao: "APROVADO", administradorId: id })])("retorna 400 para JSON/dados inválidos", async (corpo) => {
  expect((await PATCH(request(await token(), corpo), contexto)).status).toBe(400);
  expect(decidir).not.toHaveBeenCalled();
});
it("retorna 400 para UUID inválido", async () => {
  expect((await PATCH(request(await token()), { params: Promise.resolve({ id: "invalido" }) })).status).toBe(400);
});
it.each([403, 404, 409])("preserva erro %i do caso de uso", async (statusCode) => {
  decidir.mockRejectedValue(new PrestadorError("Falha controlada", statusCode));
  expect((await PATCH(request(await token()), contexto)).status).toBe(statusCode);
});
it.each(["PENDENTE", "REJEITADO"])("prestador %s não aceita corrida, mesmo com perfil forjado no corpo", async (statusAprovacao) => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ ...usuario, administrador: false, prestador: { statusAprovacao } } as never);
  const gravar = vi.spyOn(PrismaCorridaRepository.prototype, "aceitar");
  const resposta = await aceitar(new NextRequest("http://localhost/api/corrida/id/aceitar", {
    method: "POST", headers: { Authorization: `Bearer ${await token()}` },
    body: JSON.stringify({ veiculoId: id, statusAprovacao: "APROVADO" }),
  }), contexto);
  expect(resposta.status).toBe(403);
  expect(gravar).not.toHaveBeenCalled();
});
