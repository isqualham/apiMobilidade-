export type TipoPhotoDTO = "usuario" | "veiculo";

export interface UploadPhotoDTO {
  tipo: TipoPhotoDTO;
  id: string;
  usuarioId: string;
  arquivo: File;
}

export interface ConsultarPhotoDTO {
  tipo: TipoPhotoDTO;
  id: string;
  usuarioId: string;
}

export interface ExcluirPhotoDTO {
  tipo: TipoPhotoDTO;
  id: string;
  usuarioId: string;
}

export interface PhotoResponseDTO {
  imagemUrl: string;
}

export const PHOTO_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PhotoDTOValidationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "PhotoDTOValidationError";
  }
}

export function validarTipoPhoto(tipo: string): TipoPhotoDTO {
  if (tipo !== "usuario" && tipo !== "veiculo") {
    throw new PhotoDTOValidationError(
      "Tipo inválido. Utilize usuario ou veiculo.",
    );
  }

  return tipo;
}

export function validarPhotoId(id: string): string {
  if (!UUID_REGEX.test(id)) {
    throw new PhotoDTOValidationError(
      "O ID informado deve ser um UUID válido.",
    );
  }

  return id;
}

export function validarArquivoPhoto(arquivo: unknown): File {
  if (!(arquivo instanceof File)) {
    throw new PhotoDTOValidationError("Envie a imagem no campo file.");
  }

  if (arquivo.size === 0) {
    throw new PhotoDTOValidationError("O arquivo enviado está vazio.");
  }

  if (arquivo.size > PHOTO_MAX_FILE_SIZE) {
    throw new PhotoDTOValidationError("A imagem deve ter no máximo 5 MB.", 413);
  }

  if (!PHOTO_MIME_TYPES.some((tipo) => tipo === arquivo.type)) {
    throw new PhotoDTOValidationError(
      "Envie uma imagem JPEG, PNG ou WebP.",
      415,
    );
  }

  return arquivo;
}

export function validarUploadPhotoDTO(dados: UploadPhotoDTO): UploadPhotoDTO {
  return {
    tipo: validarTipoPhoto(dados.tipo),
    id: validarPhotoId(dados.id),
    usuarioId: validarPhotoId(dados.usuarioId),
    arquivo: validarArquivoPhoto(dados.arquivo),
  };
}

export function validarConsultarPhotoDTO(
  dados: ConsultarPhotoDTO,
): ConsultarPhotoDTO {
  return {
    tipo: validarTipoPhoto(dados.tipo),
    id: validarPhotoId(dados.id),
    usuarioId: validarPhotoId(dados.usuarioId),
  };
}

export function validarExcluirPhotoDTO(
  dados: ExcluirPhotoDTO,
): ExcluirPhotoDTO {
  return validarConsultarPhotoDTO(dados);
}
