import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { GET as historico } from "@/app/api/corrida/route";
import { GET as ativa } from "@/app/api/corrida/ativa/route";
import { GET as disponiveis } from "@/app/api/corrida/disponiveis/route";
import { GET as detalhe } from "@/app/api/corrida/[id]/route";

vi.mock("@/lib/prisma", () => ({ prisma: { usuario: { findUnique: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const ctx = { params: Promise.resolve({ id }) };
const rotas = [historico, ativa, disponiveis, (r: Request) => detalhe(r, ctx)];
let bearer: string;
beforeEach(async () => {
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  bearer = await gerarToken({ sub: id, nome: "Teste", email: "x@test.invalid", administrador: true });
  vi.mocked(prisma.usuario.findUnique).mockReset().mockResolvedValue({ id, ativo: true, administrador: false, prestador: null } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const req = (query = "", token = bearer) => new Request(`http://localhost/api/corrida${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
it.each(rotas)("consulta exige JWT válido", async (rota) => {
  expect((await rota(req("", ""))).status).toBe(401);
  expect((await rota(req("", "invalido"))).status).toBe(401);
});
it.each(rotas)("usuário inativo não acessa consultas", async (rota) => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: false } as never);
  expect((await rota(req())).status).toBe(401);
});
it("usa somente identidade autenticada e protege cache", async () => {
  const spy = vi.spyOn(PrismaCorridaConsultaRepository.prototype, "historico").mockResolvedValue({ corridas: [], proximoCursor: null });
  const resposta = await historico(req());
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
  expect(spy).toHaveBeenCalledWith(id, { limite: 20, papel: "todos" });
  expect((await historico(req("?usuarioId=" + id))).status).toBe(400);
  expect(spy).toHaveBeenCalledTimes(1);
});
it("ativa ausente é 200 com null", async () => {
  vi.spyOn(PrismaCorridaConsultaRepository.prototype, "ativa").mockResolvedValue(null);
  expect(await (await ativa(req())).json()).toEqual({ corrida: null });
});
it("detalhes não revelam existência de corrida de terceiros", async () => {
  vi.spyOn(PrismaCorridaConsultaRepository.prototype, "detalhe").mockResolvedValue(null);
  const resposta = await detalhe(req(), ctx);
  expect(resposta.status).toBe(404);
  expect(await resposta.json()).toEqual({ mensagem: "Corrida não encontrada." });
});
it.each([403, 409])("ofertas preservam erro de elegibilidade %i", async (status) => {
  vi.spyOn(PrismaCorridaConsultaRepository.prototype, "disponiveis").mockRejectedValue(new CorridaError("Indisponível", status));
  expect((await disponiveis(req("?veiculoId=" + id))).status).toBe(status);
});
