import type { CadastrarTarifaCategoriaDTO } from "./CadastrarTarifaCategoriaDTO";

export interface TarifaCategoria {
  id: string;
  categoriaVeiculoId: string;
  valorKm: number;
  tarifaMinima: number;
  taxaPartida: number;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TarifaCategoriaRepository {
  listarAtivas(): Promise<TarifaCategoria[]>;
  buscarPorCategoria(
    categoriaVeiculoId: string,
  ): Promise<TarifaCategoria | null>;
  categoriaAtivaExiste(id: string): Promise<boolean>;
  cadastrar(data: CadastrarTarifaCategoriaDTO): Promise<TarifaCategoria>;
}
