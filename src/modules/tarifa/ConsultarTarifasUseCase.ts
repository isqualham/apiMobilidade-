import type {
  TarifaCategoria,
  TarifaCategoriaRepository,
} from "./TarifaCategoriaRepository";

export class ConsultarTarifasUseCase {
  constructor(private readonly repository: TarifaCategoriaRepository) {}

  async executar(): Promise<TarifaCategoria[]> {
    return this.repository.listarAtivas();
  }
}
