import { expect, it, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { POST } from "@/app/api/corrida/cotacao/route";
import { CotarCorridaUseCase } from "@/modules/corrida/CotarCorridaUseCase";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
vi.mock("@/lib/prisma", () => ({ prisma: { sessaoAuth: { findFirst: vi.fn() }, usuario: { findUnique: vi.fn() } } }));
vi.mock("@/modules/corrida/OsrmRotasService", () => ({ criarRotasService: vi.fn(() => ({ calcularRota: vi.fn() })) }));
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => { vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({
    revogadaEm: null, motivoRevogacao: null, expiraEm: new Date(Date.now() + 86400000),
  } as never);
  vi.stubEnv("JWT_SECRET", "segredo-exclusivo-testes-nao-usar-em-producao"); vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true } as never); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const token = () => gerarToken({ sid: "00000000-0000-4000-8000-000000000099", sub: id, nome: "Teste", email: "teste@test.invalid", administrador: false });
function req(bearer?: string, body = "{}") { return new Request("http://localhost/api/corrida/cotacao", { method: "POST", headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body }); }
it.each([undefined, "invalido"])("exige autenticação", async bearer => { expect((await POST(req(bearer))).status).toBe(401); });
it("usuário inativo não pode cotar", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: false } as never);
  expect((await POST(req(await token()))).status).toBe(401);
});
it("retorna cotação sem cache e trata JSON inválido", async () => {
  const cotacao = { categoriaVeiculoId: id, valorTotal: 7, distanciaKm: 1, duracaoSegundos: null };
  vi.spyOn(CotarCorridaUseCase.prototype, "executar").mockResolvedValue(cotacao);
  const r = await POST(req(await token()));
  expect(r.status).toBe(200); expect(await r.json()).toEqual(cotacao); expect(r.headers.get("Cache-Control")).toContain("no-store");
  expect((await POST(req(await token(), "{"))).status).toBe(400);
});
it.each([400, 404, 422, 429, 502, 503, 504])("preserva erro de negócio/provedor %s", async status => {
  vi.spyOn(CotarCorridaUseCase.prototype, "executar").mockRejectedValue(new CorridaError("Falha", status));
  expect((await POST(req(await token()))).status).toBe(status);
});
