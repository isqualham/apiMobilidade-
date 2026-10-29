import type { CategoriasDisponiveisRepository } from "./CategoriasDisponiveisRepository";

export class ListarCategoriasDisponiveisUseCase {
  constructor(private readonly repository: CategoriasDisponiveisRepository) {}
  executar(usuarioId: string) {
    return this.repository.listar(usuarioId);
  }
}
