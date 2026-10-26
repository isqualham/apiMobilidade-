import type { IniciarCorridaDTO, CorridaResponseDTO } from "./CorridaDTO";

import { validarUUID } from "./CorridaDTO";

import type { CorridaRepository } from "./CorridaRepository";

export class IniciarCorridaUseCase {
  constructor(private readonly repository: CorridaRepository) {}

  async executar(dados: IniciarCorridaDTO): Promise<CorridaResponseDTO> {
    validarUUID(dados.corridaId, "ID da corrida");
    validarUUID(dados.usuarioId, "ID do usuário");

    return this.repository.iniciar(dados.corridaId, dados.usuarioId);
  }
}
