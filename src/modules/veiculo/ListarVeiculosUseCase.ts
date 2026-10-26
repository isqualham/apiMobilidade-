import type { VeiculoResponseDTO } from "./CadastrarVeiculoDTO";
import { ErroVeiculo } from "./CadastrarVeiculoDTO";
import type { VeiculoRepository } from "./VeiculoRepository";

export class ListarVeiculosUseCase {
  constructor(private readonly repository: VeiculoRepository) {}

  async executar(prestadorId: string): Promise<VeiculoResponseDTO[]> {
    if (!prestadorId) {
      throw new ErroVeiculo("Prestador não identificado.", 401);
    }

    return this.repository.listarPorPrestador(prestadorId);
  }
}
