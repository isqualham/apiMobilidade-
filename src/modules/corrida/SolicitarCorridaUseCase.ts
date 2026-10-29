import type { SolicitarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";
import { validarUUID, validarTexto } from "./CorridaDTO";
import type { CorridaRepository } from "./CorridaRepository";
import type { RotasService } from "./RotasService";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";
import { CalcularCotacaoCorrida } from "./CalcularCotacaoCorrida";

export class SolicitarCorridaUseCase {
  private readonly calculo: CalcularCotacaoCorrida;
  constructor(private readonly repository: CorridaRepository, tarifaRepository: TarifaCategoriaRepository, rotasService: RotasService) {
    this.calculo = new CalcularCotacaoCorrida(tarifaRepository, rotasService);
  }
  async executar(dados: SolicitarCorridaDTO): Promise<CorridaResponseDTO> {
    validarUUID(dados.passageiroId, "Passageiro");
    validarTexto(dados.origemEndereco, "Origem", 500);
    validarTexto(dados.destinoEndereco, "Destino", 500);
    const { valores } = await this.calculo.executar(dados);
    return this.repository.criar({ ...dados, ...valores });
  }
}
