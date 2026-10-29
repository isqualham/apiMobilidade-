import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaRecusaOfertaRepository } from "@/modules/corrida/PrismaRecusaOfertaRepository";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { POST } from "@/app/api/corrida/[id]/recusar/route";
vi.mock("@/lib/prisma", () => ({ prisma: { sessaoAuth: { findFirst: vi.fn() }, usuario: { findUnique: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const contexto = { params: Promise.resolve({ id }) };
beforeEach(() => { vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({
    revogadaEm: null, motivoRevogacao: null, expiraEm: new Date(Date.now() + 86400000),
  } as never);
  vi.stubEnv("JWT_SECRET", "segredo-exclusivo-de-teste-nao-utilizar-em-producao"); vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true } as never); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const token = () => gerarToken({ sid: "00000000-0000-4000-8000-000000000099", sub: id, nome: "Teste", email: "teste@test.invalid", administrador: false });
function req(bearer?: string, body?: string) { return new Request("http://localhost/api/corrida/id/recusar", { method: "POST", headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body }); }
it.each([undefined, "invalido"])("JWT ausente/inválido retorna 401", async bearer => { expect((await POST(req(bearer), contexto)).status).toBe(401); });
it("usa identidade autenticada e aceita corpo vazio", async () => {
  const recusar = vi.spyOn(PrismaRecusaOfertaRepository.prototype, "recusar").mockResolvedValue({ corridaId: id, recusada: true, recusadaEm: new Date().toISOString() });
  const resposta = await POST(req(await token()), contexto);
  expect(resposta.status).toBe(200); expect(resposta.headers.get("Cache-Control")).toContain("no-store");
  expect(recusar).toHaveBeenCalledWith({ usuarioId: id, corridaId: id });
  expect((await POST(req(await token(), '{"usuarioId":"outro"}'), contexto)).status).toBe(400);
  expect((await POST(req(await token(), '{'), contexto)).status).toBe(400);
});
it.each([403, 404, 409])("preserva erro %s", async status => {
  vi.spyOn(PrismaRecusaOfertaRepository.prototype, "recusar").mockRejectedValue(new CorridaError("Recusa impedida", status));
  expect((await POST(req(await token()), contexto)).status).toBe(status);
});
