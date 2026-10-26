import type { CancelarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";

import { validarMotivo } from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";

export class CancelarCorridaUseCase {
  constructor(private readonly repository: CorridaRepository) {}

  async executar(dados: CancelarCorridaDTO): Promise<CorridaResponseDTO> {
    validarMotivo(dados);

    return this.repository.cancelar(dados);
  }
}
