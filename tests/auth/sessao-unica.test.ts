import { randomBytes } from "node:crypto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaSessaoRepository } from "@/modules/auth/PrismaSessaoRepository";
import { gerarToken } from "@/modules/auth/TokenService";
import { autenticarRequisicao } from "@/modules/auth/AutenticarRequisicao";
import { prisma } from "@/lib/prisma";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as enviar } from "@/app/api/auth/codigo/enviar/route";
import { POST as verificar } from "@/app/api/auth/codigo/verificar/route";
import { POST as aceitar } from "@/app/api/corrida/[id]/aceitar/route";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { POST as refresh } from "@/app/api/auth/refresh/route";
import { sessaoUseCase } from "@/modules/auth/SessaoDependencias";
import { RefreshInvalidoError } from "@/modules/auth/SessaoDTO";
vi.mock("@/lib/prisma", () => ({ prisma: {
  sessaoAuth: { findFirst: vi.fn() }, usuario: { findUnique: vi.fn() },
} }));
vi.mock("@/modules/auth/SessaoDependencias", () => ({ sessaoUseCase: { renovar: vi.fn() } }));
const id = "00000000-0000-4000-8000-000000000001";
const sid = "00000000-0000-4000-8000-000000000002";
const mensagem = "Sua conta foi acessada em outro dispositivo.";
const ativo = () => ({ revogadaEm: null, motivoRevogacao: null, expiraEm: new Date(Date.now() + 60000) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue(ativo() as never);
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true, prestador: null } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function req(sessao: string | undefined = sid) {
  const token = await gerarToken({ sub: id, sid: sessao, nome: "Teste", email: "x@test.invalid", administrador: false });
  return new NextRequest("http://localhost/api/auth/me", { method: "POST", headers: { Authorization: "Bearer " + token }, body: "{}" });
}
function repo() {
  const tx = {
    usuario: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    sessaoAuth: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: sid }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ motivoRevogacao: "OUTRO_LOGIN" }),
    },
    refreshToken: { findUnique: vi.fn().mockResolvedValue({ sessaoId: sid }) },
    prestador: { updateMany: vi.fn() },
  };
  const banco = { $transaction: vi.fn(async callback => callback(tx)) };
  return { tx, banco, repository: new PrismaSessaoRepository(banco as unknown as PrismaClient) };
}
it("login bloqueia conta ativa antes de revogar sessões e criar a nova atomicamente", async () => {
  const { tx, banco, repository } = repo();
  const expira = new Date(Date.now() + 10000);
  expect(await repository.criar(id, "hash", expira)).toBe(sid);
  expect(tx.usuario.updateMany).toHaveBeenCalledWith({ where: { id, ativo: true }, data: { updatedAt: expect.any(Date) } });
  expect(tx.sessaoAuth.updateMany).toHaveBeenCalledWith({
    where: { usuarioId: id, revogadaEm: null, expiraEm: { lte: expect.any(Date) } }, data: { revogadaEm: expect.any(Date), motivoRevogacao: "EXPIRADA" },
  });
  expect(tx.sessaoAuth.create).toHaveBeenCalledWith({ data: { usuarioId: id, expiraEm: expira, tokens: { create: { tokenHash: "hash", expiraEm: expira } } } });
  expect(tx.usuario.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.sessaoAuth.updateMany.mock.invocationCallOrder[0]);
  expect(tx.sessaoAuth.updateMany.mock.invocationCallOrder[0]).toBeLessThan(tx.sessaoAuth.create.mock.invocationCallOrder[0]);
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted" });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it("usuário inativo não substitui sessão", async () => {
  const { tx, repository } = repo(); tx.usuario.updateMany.mockResolvedValue({ count: 0 });
  await expect(repository.criar(id, "hash", new Date())).rejects.toBeInstanceOf(RefreshInvalidoError);
  expect(tx.sessaoAuth.create).not.toHaveBeenCalled();
  expect(tx.sessaoAuth.updateMany).not.toHaveBeenCalled();
});
it("refresh antigo identifica substituição sem reabrir sessão nem modificar prestador", async () => {
  const { tx, repository } = repo(); tx.sessaoAuth.updateMany.mockResolvedValue({ count: 0 });
  await expect(repository.rotacionar("antigo", "novo", new Date())).rejects.toThrow(mensagem);
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
  expect(tx.sessaoAuth.create).not.toHaveBeenCalled();
});
it("logout da sessão substituída não interfere na nova seleção Online", async () => {
  const { tx, repository } = repo(); tx.sessaoAuth.updateMany.mockResolvedValue({ count: 0 });
  await repository.revogar("antigo");
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it.each([null, { statusAprovacao: "APROVADO" }])("sessão vigente permite cliente/prestador e reabrir não cria sessão", async prestador => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true, prestador } as never);
  const request = await req();
  expect((await me(request)).status).toBe(200);
  expect((await me(request)).status).toBe(200);
  expect(prisma.sessaoAuth.findFirst).toHaveBeenCalledWith({
    where: { id: sid, usuarioId: id },
    select: { revogadaEm: true, expiraEm: true, motivoRevogacao: true },
  });
});
it("JWT ainda válido mas substituído retorna mensagem exata em me e endpoints de SMS", async () => {
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({ ...ativo(), revogadaEm: new Date(), motivoRevogacao: "OUTRO_LOGIN" } as never);
  for (const endpoint of [me, enviar, verificar]) {
    const resposta = await endpoint(await req());
    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: mensagem });
  }
  expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
});
it("sessão substituída não chega ao aceite de corrida", async () => {
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({ ...ativo(), revogadaEm: new Date(), motivoRevogacao: "OUTRO_LOGIN" } as never);
  const acao = vi.spyOn(PrismaCorridaRepository.prototype, "aceitar");
  const resposta = await aceitar(await req(), { params: Promise.resolve({ id }) });
  expect(resposta.status).toBe(401);
  expect(await resposta.json()).toEqual({ mensagem });
  expect(acao).not.toHaveBeenCalled();
});
it.each([null, { ...ativo(), revogadaEm: new Date() }, { ...ativo(), expiraEm: new Date(0) }])("sessão ausente, revogada ou expirada não autentica", async sessao => {
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue(sessao as never);
  await expect(autenticarRequisicao(await req())).rejects.toThrow("Token ausente ou inválido.");
});
it("JWT legado assinado sem sid é recusado", async () => {
  const token = await gerarToken({ sub: id, nome: "Teste", email: "x@test.invalid", administrador: false });
  expect((await me(new Request("http://localhost", { headers: { Authorization: "Bearer " + token } }))).status).toBe(401);
  expect(prisma.sessaoAuth.findFirst).not.toHaveBeenCalled();
});
it("refresh transmite mensagem de substituição com HTTP 401", async () => {
  vi.mocked(sessaoUseCase.renovar).mockRejectedValue(new RefreshInvalidoError(mensagem));
  const resposta = await refresh(new Request("http://localhost", { method: "POST", body: JSON.stringify({ refreshToken: "x".repeat(43) }) }));
  expect(resposta.status).toBe(401);
  expect(await resposta.json()).toEqual({ erro: mensagem });
});

it("sessão ativa bloqueia criação e não altera disponibilidade", async () => {
  const { tx, repository } = repo();
  tx.sessaoAuth.findFirst.mockResolvedValue({ id } as never);
  await expect(repository.criar(id, "hash", new Date())).rejects.toMatchObject({ codigo: "SESSAO_ATIVA_EXISTENTE" });
  expect(tx.sessaoAuth.create).not.toHaveBeenCalled();
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
