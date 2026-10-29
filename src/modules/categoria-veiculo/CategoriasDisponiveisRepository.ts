export interface CategoriaDisponivelDTO {
  id: string;
  tipoVeiculoId: string;
  nome: string;
  descricao: string | null;
  ordemExibicao: number;
}
export interface CategoriasDisponiveisRepository {
  listar(usuarioId: string): Promise<CategoriaDisponivelDTO[]>;
}
