export type TipoPhoto = "usuario" | "veiculo";

export interface PhotoRegistro {
  id: string;
  imagemUrl: string | null;
  proprietarioUsuarioId: string;
}

export interface PhotoRepository {
  buscar(tipo: TipoPhoto, id: string): Promise<PhotoRegistro | null>;

  atualizarImagem(
    tipo: TipoPhoto,
    id: string,
    imagemUrl: string | null,
  ): Promise<void>;

  atualizarImagemSeAtual(
    tipo: TipoPhoto,
    id: string,
    imagemAtual: string | null,
    novaImagem: string | null,
  ): Promise<boolean>;
}

export class PhotoError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PhotoError";
  }
}
