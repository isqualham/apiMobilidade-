export interface CadastrarVeiculoDTO {
  categoriaVeiculoId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor?: string | null;
  imagemUrl?: string | null;
  ativo?: boolean;
}

export interface VeiculoResponseDTO {
  id: string;
  prestadorId: string;
  categoriaVeiculoId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  cor: string | null;
  imagemUrl: string | null;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ErroVeiculo extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ErroVeiculo";
  }
}
