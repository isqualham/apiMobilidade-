export interface CadastrarCategoriaVeiculoDTO {
  tipoVeiculoId: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  ordemExibicao?: number;
}
