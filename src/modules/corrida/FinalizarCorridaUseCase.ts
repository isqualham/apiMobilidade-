import type { FinalizarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";

import { validarUUID } from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";

export class FinalizarCorridaUseCase {
  constructor(private readonly repository: CorridaRepository) {}

  async executar(dados: FinalizarCorridaDTO): Promise<CorridaResponseDTO> {
    validarUUID(dados.corridaId, "ID da corrida");
    validarUUID(dados.usuarioId, "ID do usuário");

    return this.repository.finalizar(dados.corridaId, dados.usuarioId);
  }
}
