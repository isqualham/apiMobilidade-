import type { SolicitarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";

import {
  CorridaError,
  validarUUID,
  validarTexto,
  validarCoordenada,
} from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";
import type { RotasService } from "./RotasService";
import { calcularValorCorrida } from "./CalcularValorCorrida";

import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";

export class SolicitarCorridaUseCase {
  constructor(
    private readonly repository: CorridaRepository,
    private readonly tarifaRepository: TarifaCategoriaRepository,
    private readonly rotasService: RotasService,
  ) {}

  async executar(dados: SolicitarCorridaDTO): Promise<CorridaResponseDTO> {
    validarUUID(dados.passageiroId, "Passageiro");
    validarUUID(dados.categoriaVeiculoId, "Categoria");

    validarTexto(dados.origemEndereco, "Origem", 500);
    validarTexto(dados.destinoEndereco, "Destino", 500);

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

    return this.repository.criar({
      ...dados,
      ...valores,
    });
  }
}
