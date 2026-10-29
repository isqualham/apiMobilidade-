import { CorridaError, validarUUID, validarCoordenada } from "./CorridaDTO";
import type { SolicitarCorridaDTO } from "./CorridaDTO";
import type { RotasService } from "./RotasService";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";
import { calcularValorCorrida } from "./CalcularValorCorrida";
export type EntradaCalculoCorrida = Pick<SolicitarCorridaDTO, "categoriaVeiculoId" | "origemLatitude" | "origemLongitude" | "destinoLatitude" | "destinoLongitude">;
export class CalcularCotacaoCorrida {
  constructor(private readonly tarifaRepository: TarifaCategoriaRepository, private readonly rotasService: RotasService) {}
  async executar(dados: EntradaCalculoCorrida) {
    validarUUID(dados.categoriaVeiculoId, "Categoria");
    validarCoordenada(dados.origemLatitude, "Latitude de origem", 90);
    validarCoordenada(dados.origemLongitude, "Longitude de origem", 180);
    validarCoordenada(dados.destinoLatitude, "Latitude de destino", 90);
    validarCoordenada(dados.destinoLongitude, "Longitude de destino", 180);

    if (
      "distanciaKm" in dados ||
      "valorTotal" in dados ||
      "valorKmAplicado" in dados
    ) {
      throw new CorridaError("Distância e preço devem ser calculados pelo servidor.");
    }

    const categoriaAtiva = await this.tarifaRepository.categoriaAtivaExiste(
      dados.categoriaVeiculoId,
    );

    if (!categoriaAtiva) {
      throw new CorridaError("Categoria inexistente ou inativa.", 404);
    }

    const tarifa = await this.tarifaRepository.buscarPorCategoria(
      dados.categoriaVeiculoId,
    );

    if (!tarifa || !tarifa.ativo) {
      throw new CorridaError(
        "Não existe tarifa ativa para essa categoria.",
        404,
      );
    }

    const rota = await this.rotasService.calcularRota({
      origem: { latitude: dados.origemLatitude, longitude: dados.origemLongitude },
      destino: {
        latitude: dados.destinoLatitude,
        longitude: dados.destinoLongitude,
      },
      categoriaVeiculoId: dados.categoriaVeiculoId,
    });
    const valores = calcularValorCorrida(rota.distanciaMetros, tarifa);

    const duracaoSegundos = rota.duracaoSegundos ?? null;
    if (duracaoSegundos !== null && (!Number.isFinite(duracaoSegundos) || duracaoSegundos < 0)) throw new CorridaError("Duração inválida do serviço de rotas.", 502);
    return { valores, duracaoSegundos };
  }
}
