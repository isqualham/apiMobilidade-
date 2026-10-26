import type { CadastrarTipoVeiculoDTO } from "./CadastrarTipoVeiculoDTO";

export interface TipoVeiculo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TipoVeiculoRepository {
  listarAtivos(): Promise<TipoVeiculo[]>;
  buscarPorNome(nome: string): Promise<TipoVeiculo | null>;
  cadastrar(data: CadastrarTipoVeiculoDTO): Promise<TipoVeiculo>;
}
