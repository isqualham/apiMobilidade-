import type {
  TipoVeiculo,
  TipoVeiculoRepository,
} from "./TipoVeiculoRepository";

export class ListarTiposVeiculoUseCase {
  constructor(private readonly repository: TipoVeiculoRepository) {}

  async executar(): Promise<TipoVeiculo[]> {
    return this.repository.listarAtivos();
  }
}
