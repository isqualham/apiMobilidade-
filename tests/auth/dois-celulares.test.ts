import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { afterEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as logout } from "@/app/api/auth/logout/route";

vi.mock("@/lib/prisma", () => ({ prisma: {
  usuario: { findUnique: vi.fn(), updateMany: vi.fn() },
  sessaoAuth: { create: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
  prestador: { updateMany: vi.fn() },
  refreshToken: { findUnique: vi.fn() },
  $transaction: vi.fn(),
} }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it.each([false, true])("A login, B bloqueado, logout A libera B (prestador=%s)", async prestador => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", "segredo-exclusivo-da-suite-dois-celulares");
  vi.spyOn(console, "log").mockImplementation(() => {});
  const usuario = { id: randomUUID(), nome: "Teste", email: "teste@example.invalid",
    senhaHash: await hash("SenhaTeste123", 4), ativo: true, administrador: false,
    telefoneVerificado: true, prestador: prestador ? { statusAprovacao: "APROVADO" } : null };
  type Sessao = { id: string; usuarioId: string; expiraEm: Date; revogadaEm: Date | null; motivoRevogacao: string | null };
  const sessoes: Sessao[] = [];
  const tokens = new Map<string, string>();
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as never);
  vi.mocked(prisma.usuario.updateMany).mockResolvedValue({ count: 1 });
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (tx: typeof prisma) => unknown) => callback(prisma)) as never);
  vi.mocked(prisma.sessaoAuth.create).mockImplementation((async ({ data }: { data: { usuarioId: string; expiraEm: Date; tokens: { create: { tokenHash: string } } } }) => {
    const sessao = { id: randomUUID(), usuarioId: data.usuarioId, expiraEm: data.expiraEm, revogadaEm: null, motivoRevogacao: null };
    sessoes.push(sessao); tokens.set(data.tokens.create.tokenHash, sessao.id);
    return sessao;
  }) as never);
  vi.mocked(prisma.sessaoAuth.updateMany).mockImplementation((async ({ where, data }: {
    where: { usuarioId?: string; id?: string; revogadaEm: null; expiraEm?: { lte: Date } };
    data: Partial<Sessao>;
  }) => {
    const encontradas = sessoes.filter(s => (!where.expiraEm || s.expiraEm <= where.expiraEm.lte) && !s.revogadaEm && (!where.id || s.id === where.id) && (!where.usuarioId || s.usuarioId === where.usuarioId));
    encontradas.forEach(s => Object.assign(s, data));
    return { count: encontradas.length };
  }) as never);
  vi.mocked(prisma.sessaoAuth.findFirst).mockImplementation((async ({ where }: { where: { id?: string; usuarioId: string; revogadaEm?: null; expiraEm?: { gt: Date } } }) =>
    sessoes.find(s => (!where.id || s.id === where.id) && s.usuarioId === where.usuarioId && (where.revogadaEm !== null || !s.revogadaEm) && (!where.expiraEm || s.expiraEm > where.expiraEm.gt)) ?? null) as never);
  vi.mocked(prisma.sessaoAuth.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) =>
    sessoes.find(s => s.id === where.id) ?? null) as never);
  vi.mocked(prisma.refreshToken.findUnique).mockImplementation((async ({ where }: { where: { tokenHash: string } }) =>
    tokens.has(where.tokenHash) ? { sessaoId: tokens.get(where.tokenHash) } : null) as never);
  const post = (corpo: unknown) => new Request("http://localhost/api/auth", { method: "POST", body: JSON.stringify(corpo) });
  const get = (token: string) => new Request("http://localhost/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  const entrar = async () => {
    const resposta = await login(post({ email: usuario.email, senha: "SenhaTeste123" }));
    expect(resposta.status).toBe(200);
    return resposta.json();
  };
  const a = await entrar();
  expect((await me(get(a.token))).status).toBe(200);

  for (const identificador of [{ email: usuario.email }, { telefone: "+5565990000001" }]) {
    const bloqueado = await login(post({ ...identificador, senha: "SenhaTeste123" }));
    expect(bloqueado.status).toBe(409);
    expect(await bloqueado.json()).toEqual({ codigo: "SESSAO_ATIVA_EXISTENTE", erro: "Esta conta já está conectada em outro dispositivo. Saia do dispositivo atual para entrar aqui." });
  }
  expect(sessoes).toHaveLength(1);
  expect(sessoes[0].revogadaEm).toBeNull();
  expect((await me(get(a.token))).status).toBe(200);
  vi.mocked(prisma.sessaoAuth.findUniqueOrThrow).mockResolvedValue(sessoes[0] as never);
  vi.mocked(prisma.prestador.updateMany).mockResolvedValue({ count: 0 });
  expect((await logout(post({ refreshToken: a.refreshToken }))).status).toBe(204);
  const b = await entrar();
  expect((await me(get(a.token))).status).toBe(401);
  expect((await me(get(b.token))).status).toBe(200);
});
