import { CorridaError } from "./CorridaDTO";
import { cotarCorridaSchema, type CotacaoCorridaDTO } from "./CotarCorridaDTO";
import { CalcularCotacaoCorrida } from "./CalcularCotacaoCorrida";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";
import type { RotasService } from "./RotasService";
export class CotarCorridaUseCase {
  private readonly calculo: CalcularCotacaoCorrida;
  constructor(tarifas: TarifaCategoriaRepository, rotas: RotasService) {
    this.calculo = new CalcularCotacaoCorrida(tarifas, rotas);
  }
  async executar(corpo: unknown): Promise<CotacaoCorridaDTO> {
    const entrada = cotarCorridaSchema.safeParse(corpo);
    if (!entrada.success) throw new CorridaError("Dados de cotação inválidos. Informe categoria e coordenadas; não envie distância ou preço.");
    const { valores, duracaoSegundos } = await this.calculo.executar(entrada.data);
    return { categoriaVeiculoId: entrada.data.categoriaVeiculoId, valorTotal: Number(valores.valorTotal), distanciaKm: Number(valores.distanciaKm), duracaoSegundos };
  }
}
