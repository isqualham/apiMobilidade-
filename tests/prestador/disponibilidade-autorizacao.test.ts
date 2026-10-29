import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrestadorError } from "@/modules/prestador/AtualizarAprovacaoPrestadorDTO";
import { GET, PATCH } from "@/app/api/prestadores/disponibilidade/route";
vi.mock("@/lib/prisma", () => ({ prisma: { sessaoAuth: { findFirst: vi.fn() }, usuario: { findUnique: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const estado = { status: "OFFLINE" as const, veiculoId: null, versao: 0 };
beforeEach(() => {
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({
    revogadaEm: null, motivoRevogacao: null, expiraEm: new Date(Date.now() + 86400000),
  } as never);
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const token = () => gerarToken({ sid: "00000000-0000-4000-8000-000000000099", sub: id, nome: "Teste", email: "teste@test.invalid", administrador: false });
function req(bearer?: string, corpo = JSON.stringify({ status: "OFFLINE", versao: 0 })) {
  return new Request("http://localhost/api/prestadores/disponibilidade", { method: "PATCH", headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body: corpo });
}
it.each([undefined, "invalido"])("ambas rotas recusam JWT ausente/inválido", async bearer => {
  expect((await GET(req(bearer))).status).toBe(401);
  expect((await PATCH(req(bearer))).status).toBe(401);
});
it("JWT expirado e usuário inativo são recusados", async () => {
  const expirado = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(id).setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET));
  expect((await PATCH(req(expirado))).status).toBe(401);
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: false } as never);
  expect((await GET(req(await token()))).status).toBe(401);
});
it("usa identidade autenticada, retorna contrato e impede campos de identidade do cliente", async () => {
  const consultar = vi.spyOn(PrismaDisponibilidadePrestadorRepository.prototype, "consultar").mockResolvedValue(estado);
  const alterar = vi.spyOn(PrismaDisponibilidadePrestadorRepository.prototype, "alterar").mockResolvedValue(estado);
  const bearer = await token();
  const resposta = await GET(req(bearer));
  expect(await resposta.json()).toEqual(estado);
  expect(resposta.headers.get("Cache-Control")).toBe("no-store");
  expect(consultar).toHaveBeenCalledWith(id);
  expect((await PATCH(req(bearer))).status).toBe(200);
  expect(alterar).toHaveBeenCalledWith(id, { status: "OFFLINE", versao: 0 });
  expect((await PATCH(req(bearer, JSON.stringify({ status: "OFFLINE", versao: 0, usuarioId: "outro" })))).status).toBe(400);
  expect(alterar).toHaveBeenCalledTimes(1);
  expect((await PATCH(req(bearer, "{"))).status).toBe(400);
});
it.each([403, 409])("preserva erro de autorização/conflito %s", async status => {
  vi.spyOn(PrismaDisponibilidadePrestadorRepository.prototype, "alterar").mockRejectedValue(new PrestadorError("Impedido", status));
  expect((await PATCH(req(await token()))).status).toBe(status);
});
