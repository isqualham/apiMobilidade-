import type { AceitarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";

import { validarUUID } from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";

export class AceitarCorridaUseCase {
  constructor(private readonly repository: CorridaRepository) {}

  async executar(dados: AceitarCorridaDTO): Promise<CorridaResponseDTO> {
    validarUUID(dados.corridaId, "ID da corrida");
    validarUUID(dados.usuarioId, "ID do usuário");
    validarUUID(dados.veiculoId, "ID do veículo");

    return this.repository.aceitar(dados);
  }
}
