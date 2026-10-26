import { describe, expect, it, vi } from "vitest";
import { SolicitarCorridaUseCase } from "@/modules/corrida/SolicitarCorridaUseCase";
import { RotasServiceNaoConfigurado } from "@/modules/corrida/RotasService";
import type { CorridaRepository } from "@/modules/corrida/CorridaRepository";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";

const entrada = {
  passageiroId: "00000000-0000-4000-8000-000000000001",
  categoriaVeiculoId: "00000000-0000-4000-8000-000000000002",
  origemEndereco: "Origem", destinoEndereco: "Destino",
  origemLatitude: -16, origemLongitude: -57,
  destinoLatitude: -16.1, destinoLongitude: -57.1,
};

function dependencias() {
  const criar = vi.fn();
  const repository = { criar } as unknown as CorridaRepository;
  const tarifaRepository = {
    categoriaAtivaExiste: vi.fn().mockResolvedValue(true),
    buscarPorCategoria: vi.fn().mockResolvedValue({ ativo: true, valorKm: 1, tarifaMinima: 0.01, taxaPartida: 0 }),
  } as unknown as TarifaCategoriaRepository;
  return { criar, repository, tarifaRepository };
}

describe("Solicitação usa exclusivamente rota do servidor", () => {
  it("sem provedor retorna 503 e nunca persiste", async () => {
    const d = dependencias();
    const useCase = new SolicitarCorridaUseCase(d.repository, d.tarifaRepository, new RotasServiceNaoConfigurado());
    await expect(useCase.executar(entrada)).rejects.toMatchObject({ statusCode: 503 });
    expect(d.criar).not.toHaveBeenCalled();
  });
  it.each(["distanciaKm", "valorTotal", "valorKmAplicado"])("rejeita %s enviado pelo cliente", async (campo) => {
    const d = dependencias();
    const calcularRota = vi.fn();
    const useCase = new SolicitarCorridaUseCase(d.repository, d.tarifaRepository, { calcularRota });
    await expect(useCase.executar({ ...entrada, [campo]: 0.001 })).rejects.toMatchObject({ statusCode: 400 });
    expect(calcularRota).not.toHaveBeenCalled();
    expect(d.criar).not.toHaveBeenCalled();
  });
  it("usa o resultado do serviço e persiste valores decimais exatos", async () => {
    const d = dependencias();
    // Double somente para teste de contrato; não é um provedor de produção.
    const calcularRota = vi.fn().mockResolvedValue({ distanciaMetros: 1005 });
    await new SolicitarCorridaUseCase(d.repository, d.tarifaRepository, { calcularRota }).executar(entrada);
    expect(calcularRota).toHaveBeenCalledWith({ origem: { latitude: -16, longitude: -57 }, destino: { latitude: -16.1, longitude: -57.1 }, categoriaVeiculoId: entrada.categoriaVeiculoId });
    expect(d.criar).toHaveBeenCalledWith({ ...entrada, distanciaKm: "1.005", valorKmAplicado: "1.00", valorTotal: "1.01" });
  });
  it("não usa fallback quando o provedor falha", async () => {
    const d = dependencias();
    const calcularRota = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(new SolicitarCorridaUseCase(d.repository, d.tarifaRepository, { calcularRota }).executar(entrada)).rejects.toThrow("timeout");
    expect(d.criar).not.toHaveBeenCalled();
  });
});
