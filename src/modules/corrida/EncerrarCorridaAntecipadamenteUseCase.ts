import type {
  EncerrarCorridaAntecipadamenteDTO,
  CorridaResponseDTO,
} from "./CorridaDTO";

import { validarMotivo } from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";

export class EncerrarCorridaAntecipadamenteUseCase {
  constructor(private readonly repository: CorridaRepository) {}

  async executar(
    dados: EncerrarCorridaAntecipadamenteDTO,
  ): Promise<CorridaResponseDTO> {
    validarMotivo(dados);

    return this.repository.encerrarAntecipadamente(dados);
  }
}
