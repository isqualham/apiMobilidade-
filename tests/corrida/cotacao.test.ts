import { expect, it, vi } from "vitest";
import { CotarCorridaUseCase } from "@/modules/corrida/CotarCorridaUseCase";
import { SolicitarCorridaUseCase } from "@/modules/corrida/SolicitarCorridaUseCase";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
import type { CorridaRepository } from "@/modules/corrida/CorridaRepository";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";
const id = "00000000-0000-4000-8000-000000000001";
const entrada = { categoriaVeiculoId: id, origemLatitude: -16, origemLongitude: -57, destinoLatitude: -16.1, destinoLongitude: -57.1 };
function setup() {
  const tarifa = { ativo: true, valorKm: 1.8, tarifaMinima: 7, taxaPartida: 3 };
  // Somente leituras são disponibilizadas: nenhuma operação de escrita pode ser chamada.
  const leitura = { categoriaAtivaExiste: vi.fn().mockResolvedValue(true), buscarPorCategoria: vi.fn().mockResolvedValue(tarifa) };
  const tarifas = leitura as unknown as TarifaCategoriaRepository;
  const rotas = { calcularRota: vi.fn().mockResolvedValue({ distanciaMetros: 5005, duracaoSegundos: 600 }) };
  return { leitura, tarifas, tarifa, rotas, cotacao: new CotarCorridaUseCase(tarifas, rotas) };
}
it("cotação e solicitação têm exatamente o mesmo preço e distância", async () => {
  const { cotacao, tarifas, rotas } = setup();
  const criar = vi.fn();
  const resultado = await cotacao.executar(entrada);
  expect(resultado).toEqual({ categoriaVeiculoId: id, valorTotal: 12.01, distanciaKm: 5.005, duracaoSegundos: 600 });
  expect(criar).not.toHaveBeenCalled();
  await new SolicitarCorridaUseCase({ criar } as unknown as CorridaRepository, tarifas, rotas).executar({ ...entrada, passageiroId: id, origemEndereco: "Origem", destinoEndereco: "Destino" });
  expect(criar).toHaveBeenCalledWith(expect.objectContaining({ valorTotal: "12.01", distanciaKm: "5.005", valorKmAplicado: "1.80" }));
  expect(criar.mock.calls[0][0]).not.toHaveProperty("duracaoSegundos");
});
it("duração ausente retorna null; cotação não exige endereço textual", async () => {
  const { cotacao, rotas } = setup(); rotas.calcularRota.mockResolvedValue({ distanciaMetros: 1000 });
  expect(await cotacao.executar(entrada)).toEqual({ categoriaVeiculoId: id, valorTotal: 7, distanciaKm: 1, duracaoSegundos: null });
});
it("duração não altera preço e tarifa atual é consultada a cada cálculo", async () => {
  const { cotacao, tarifa, rotas } = setup();
  const primeiro = await cotacao.executar(entrada);
  rotas.calcularRota.mockResolvedValue({ distanciaMetros: 5005, duracaoSegundos: 9999 });
  expect((await cotacao.executar(entrada)).valorTotal).toBe(primeiro.valorTotal);
  tarifa.tarifaMinima = 20;
  expect((await cotacao.executar(entrada)).valorTotal).toBe(20);
});
it.each([{ valorTotal: 1 }, { distanciaKm: 1 }, { passageiroId: id }, { origemLatitude: 91 }, { categoriaVeiculoId: "x" }, { destinoLongitude: "-57" }])("rejeita entrada inválida %j antes de consultar", async alteracao => {
  const { cotacao, leitura, rotas } = setup();
  await expect(cotacao.executar({ ...entrada, ...alteracao })).rejects.toMatchObject({ statusCode: 400 });
  expect(leitura.categoriaAtivaExiste).not.toHaveBeenCalled(); expect(rotas.calcularRota).not.toHaveBeenCalled();
});
it.each(["categoria", "tarifa", "inativa"])("recusa %s indisponível", async caso => {
  const { cotacao, leitura, rotas } = setup();
  if (caso === "categoria") leitura.categoriaAtivaExiste.mockResolvedValue(false);
  else leitura.buscarPorCategoria.mockResolvedValue(caso === "tarifa" ? null : { ativo: false });
  await expect(cotacao.executar(entrada)).rejects.toMatchObject({ statusCode: 404 });
  expect(rotas.calcularRota).not.toHaveBeenCalled();
});
it.each([422, 429, 502, 503, 504])("propaga erro OSRM %s sem inventar distância", async status => {
  const { cotacao, rotas } = setup(); rotas.calcularRota.mockRejectedValue(new CorridaError("Provedor indisponível", status));
  await expect(cotacao.executar(entrada)).rejects.toMatchObject({ statusCode: status });
});
it("mantém limite monetário e rejeita duração inválida", async () => {
  const { cotacao, tarifa, rotas } = setup(); tarifa.valorKm = 99999999.99;
  await expect(cotacao.executar(entrada)).rejects.toMatchObject({ statusCode: 422 });
  tarifa.valorKm = 1.8; rotas.calcularRota.mockResolvedValue({ distanciaMetros: 5005, duracaoSegundos: -1 });
  await expect(cotacao.executar(entrada)).rejects.toMatchObject({ statusCode: 502 });
});
