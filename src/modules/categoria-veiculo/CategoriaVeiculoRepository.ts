import type { CadastrarCategoriaVeiculoDTO } from "./CadastrarCategoriaVeiculoDTO";

export interface CategoriaVeiculo {
  id: string;
  tipoVeiculoId: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordemExibicao: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoriaVeiculoRepository {
  listarAtivas(): Promise<CategoriaVeiculo[]>;
  buscarPorNome(nome: string): Promise<CategoriaVeiculo | null>;
  tipoVeiculoAtivoExiste(id: string): Promise<boolean>;
  cadastrar(data: CadastrarCategoriaVeiculoDTO): Promise<CategoriaVeiculo>;
}
