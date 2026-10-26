import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PrismaTarifaCategoriaRepository } from "@/modules/tarifa/PrismaTarifaCategoriaRepository";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { POST } from "@/app/api/corrida/route";

vi.mock("@/modules/auth/AutenticarRequisicao", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/modules/auth/AutenticarRequisicao")>();
  return {
    ...original,
    autenticarRequisicao: vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" }),
  };
});
beforeEach(() => vi.stubEnv("OSRM_BASE_URL", ""));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("a composição real da rota falha com 503 e não escreve sem provedor", async () => {
  vi.spyOn(PrismaTarifaCategoriaRepository.prototype, "categoriaAtivaExiste").mockResolvedValue(true);
  vi.spyOn(PrismaTarifaCategoriaRepository.prototype, "buscarPorCategoria").mockResolvedValue({
    id: "tarifa", categoriaVeiculoId: "00000000-0000-4000-8000-000000000002",
    ativo: true, valorKm: 1, tarifaMinima: 1, taxaPartida: 0,
    createdAt: new Date(), updatedAt: new Date(),
  });
  const criar = vi.spyOn(PrismaCorridaRepository.prototype, "criar");
  const resposta = await POST(new Request("http://localhost/api/corrida", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoriaVeiculoId: "00000000-0000-4000-8000-000000000002",
      origemEndereco: "Origem", destinoEndereco: "Destino",
      origemLatitude: -16, origemLongitude: -57, destinoLatitude: -16.1, destinoLongitude: -57.1,
    }),
  }));
  expect(resposta.status).toBe(503);
  expect(await resposta.json()).toHaveProperty("mensagem", expect.stringContaining("não configurado"));
  expect(criar).not.toHaveBeenCalled();
});
