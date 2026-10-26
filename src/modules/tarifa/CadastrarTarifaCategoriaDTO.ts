export interface CadastrarTarifaCategoriaDTO {
  categoriaVeiculoId: string;
  valorKm: number;
  tarifaMinima: number;
  taxaPartida?: number;
  ativo?: boolean;
}
