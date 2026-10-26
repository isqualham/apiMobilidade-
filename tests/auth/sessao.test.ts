import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SessaoUseCase, hashRefresh } from "@/modules/auth/SessaoUseCase";
import { verificarToken } from "@/modules/auth/TokenService";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { sessaoUseCase } from "@/modules/auth/SessaoDependencias";
import { RefreshInvalidoError } from "@/modules/auth/SessaoDTO";
import { swaggerSpec } from "@/lib/swagger";
import type { OpenAPIV3 } from "openapi-types";

vi.mock("@/modules/auth/SessaoDependencias", () => ({ sessaoUseCase: { renovar: vi.fn(), logout: vi.fn() } }));
const usuario = { id: "00000000-0000-4000-8000-000000000001", nome: "Teste", email: "teste@example.invalid", administrador: false };
const sid = "00000000-0000-4000-8000-000000000002";
const repository = { criar: vi.fn(), rotacionar: vi.fn(), revogar: vi.fn() };
const caso = new SessaoUseCase(repository);
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex")); });
afterEach(() => { vi.unstubAllEnvs(); });
function request(corpo: unknown) {
  return new Request("http://localhost/api/auth/refresh", { method: "POST", body: JSON.stringify(corpo) });
}
it("gera refresh imprevisível, transmite somente hash ao repositório e mantém JWT 1h", async () => {
  repository.criar.mockResolvedValue(sid);
  const primeiro = await caso.criar(usuario); const segundo = await caso.criar(usuario);
  expect(primeiro.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(primeiro.refreshToken).not.toBe(segundo.refreshToken);
  expect(repository.criar).toHaveBeenCalledWith(usuario.id, hashRefresh(primeiro.refreshToken), expect.any(Date));
  const payload = await verificarToken(primeiro.token);
  expect(payload).toMatchObject({ sub: usuario.id, sid });
  expect(payload.exp! - payload.iat!).toBe(3600);
});
it("renovação usa somente identidade devolvida pelo repositório", async () => {
  repository.rotacionar.mockResolvedValue({ sessaoId: sid, usuario });
  const token = randomBytes(32).toString("base64url");
  const novo = await caso.renovar(token);
  expect(repository.rotacionar).toHaveBeenCalledWith(hashRefresh(token), hashRefresh(novo.refreshToken), expect.any(Date));
  expect(await verificarToken(novo.token)).toMatchObject({ sub: usuario.id, sid });
});
it("rejeita resultado revogado/inválido e usa hash no logout", async () => {
  repository.rotacionar.mockResolvedValue(null);
  await expect(caso.renovar("invalido")).rejects.toBeInstanceOf(RefreshInvalidoError);
  await caso.logout("segredo");
  expect(repository.revogar).toHaveBeenCalledWith(hashRefresh("segredo"));
});
it.each([{}, null, [], { refreshToken: "" }, { refreshToken: "invalido" }, { refreshToken: "x".repeat(43), usuarioId: usuario.id }, { refreshToken: "x".repeat(43), administrador: true }])(
  "endpoints rejeitam corpo inválido/identidade fornecida pelo cliente: %j", async corpo => {
    for (const endpoint of [refresh, logout]) expect((await endpoint(request(corpo))).status).toBe(400);
    expect(sessaoUseCase.renovar).not.toHaveBeenCalled(); expect(sessaoUseCase.logout).not.toHaveBeenCalled();
  },
);
it("JSON malformado retorna 400", async () => {
  expect((await refresh(new Request("http://localhost", { method: "POST", body: "{" }))).status).toBe(400);
});
it("refresh não exige access token e responde sem cache", async () => {
  vi.mocked(sessaoUseCase.renovar).mockResolvedValue({ token: "access", refreshToken: "novo" });
  const resposta = await refresh(request({ refreshToken: "x".repeat(43) }));
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  expect(await resposta.json()).toEqual({ token: "access", refreshToken: "novo" });
});
it("refresh inválido retorna 401 genérico, sem expor token", async () => {
  vi.mocked(sessaoUseCase.renovar).mockRejectedValue(new RefreshInvalidoError());
  const resposta = await refresh(request({ refreshToken: "x".repeat(43) }));
  expect(resposta.status).toBe(401);
  expect(await resposta.json()).toEqual({ erro: "Refresh token inválido, expirado ou revogado." });
});
it("falha interna não vaza token em resposta ou logs", async () => {
  const log = vi.spyOn(console, "error");
  vi.mocked(sessaoUseCase.renovar).mockRejectedValue(new Error("segredo"));
  const resposta = await refresh(request({ refreshToken: "x".repeat(43) }));
  expect(resposta.status).toBe(500);
  expect(await resposta.text()).not.toContain("segredo");
  expect(log).not.toHaveBeenCalled(); log.mockRestore();
});
it("logout responde 204 sem corpo", async () => {
  const resposta = await logout(request({ refreshToken: "x".repeat(43) }));
  expect(resposta.status).toBe(204); expect(await resposta.text()).toBe("");
});
it("OpenAPI descreve refresh, logout e os campos preservados do login", () => {
  const documento = swaggerSpec as OpenAPIV3.Document;
  expect(documento.paths["/api/auth/refresh"]?.post?.responses).toHaveProperty("401");
  expect(documento.paths["/api/auth/logout"]?.post?.responses).toHaveProperty("204");
  expect(documento.components?.schemas?.LoginSessao).toHaveProperty("required", expect.arrayContaining(["token", "refreshToken", "id"]));
});
