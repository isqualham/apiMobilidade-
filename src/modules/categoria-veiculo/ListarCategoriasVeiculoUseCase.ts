import type {
  CategoriaVeiculo,
  CategoriaVeiculoRepository,
} from "./CategoriaVeiculoRepository";

export class ListarCategoriasVeiculoUseCase {
  constructor(private readonly repository: CategoriaVeiculoRepository) {}

  async executar(): Promise<CategoriaVeiculo[]> {
    return this.repository.listarAtivas();
  }
}
