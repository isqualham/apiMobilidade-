import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";

import {
  PhotoError,
  type PhotoRepository,
  type TipoPhoto,
} from "./PhotoRepository";

import {
  validarUploadPhotoDTO,
  validarConsultarPhotoDTO,
  validarExcluirPhotoDTO,
  PhotoDTOValidationError,
  type UploadPhotoDTO,
  type ConsultarPhotoDTO,
  type ExcluirPhotoDTO,
  type PhotoResponseDTO,
} from "./PhotoDTO";

function obterConfiguracaoR2() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Configuração do Cloudflare R2 incompleta.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

let clienteR2: S3Client | null = null;

function obterClienteR2(): S3Client {
  if (clienteR2) return clienteR2;

  const configuracao = obterConfiguracaoR2();

  clienteR2 = new S3Client({
    region: "auto",
    endpoint: `https://${configuracao.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: configuracao.accessKeyId,
      secretAccessKey: configuracao.secretAccessKey,
    },
  });

  return clienteR2;
}

function obterBucket(): string {
  return obterConfiguracaoR2().bucket;
}

function chaveGerenciadaPeloViaU(
  tipo: TipoPhoto,
  id: string,
  chave: string,
): boolean {
  const prefixo = `photo/${tipo}/${id}/`;

  return (
    chave.startsWith(prefixo) &&
    /^[a-zA-Z0-9/_\-.]+$/.test(chave) &&
    !chave.includes("..")
  );
}

async function removerObjeto(chave: string): Promise<void> {
  await obterClienteR2().send(
    new DeleteObjectCommand({
      Bucket: obterBucket(),
      Key: chave,
    }),
  );
}

async function otimizarImagem(arquivo: File, tipo: TipoPhoto): Promise<Buffer> {
  const entrada = Buffer.from(await arquivo.arrayBuffer());

  let metadata: Metadata;

  try {
    metadata = await sharp(entrada, {
      failOn: "error",
      limitInputPixels: 25_000_000,
    }).metadata();
  } catch {
    throw new PhotoError("Arquivo de imagem inválido ou corrompido.", 400);
  }

  if (
    !metadata.width ||
    !metadata.height ||
    !["jpeg", "png", "webp"].includes(metadata.format ?? "")
  ) {
    throw new PhotoError("Formato de imagem não suportado.", 400);
  }

  const largura = tipo === "usuario" ? 512 : 1024;
  const altura = tipo === "usuario" ? 512 : 768;
  const tamanhoAlvo = tipo === "usuario" ? 100_000 : 200_000;

  try {
    let melhorImagem: Buffer | null = null;

    for (const qualidade of [80, 70, 60, 50, 40]) {
      let pipeline = sharp(entrada, {
        failOn: "error",
        limitInputPixels: 25_000_000,
      }).rotate();

      if (tipo === "usuario") {
        pipeline = pipeline.resize(largura, altura, {
          fit: "cover",
          position: "attention",
          withoutEnlargement: false,
        });
      } else {
        pipeline = pipeline.resize(largura, altura, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      const resultado = await pipeline
        .webp({
          quality: qualidade,
          effort: 4,
        })
        .toBuffer();

      melhorImagem = resultado;

      if (resultado.length <= tamanhoAlvo) {
        break;
      }
    }

    if (!melhorImagem) {
      throw new Error("Falha ao gerar WebP.");
    }

    if (melhorImagem.length > 1024 * 1024) {
      throw new PhotoError("A imagem otimizada ultrapassou 1 MB.", 413);
    }

    return melhorImagem;
  } catch (error) {
    if (error instanceof PhotoError) {
      throw error;
    }

    throw new PhotoError("Não foi possível processar a imagem.", 400);
  }
}

export class UploadPhotoUseCase {
  constructor(private readonly repository: PhotoRepository) {}

  private async obterRegistroAutorizado(
    tipo: TipoPhoto,
    id: string,
    usuarioId: string,
  ) {
    const registro = await this.repository.buscar(tipo, id);

    if (!registro || registro.proprietarioUsuarioId !== usuarioId) {
      throw new PhotoError(
        "Foto não encontrada ou acesso não autorizado.",
        404,
      );
    }

    return registro;
  }

  async enviar(dados: UploadPhotoDTO): Promise<PhotoResponseDTO> {
    const { tipo, id, usuarioId, arquivo } = validarUploadPhotoDTO(dados);

    const registro = await this.obterRegistroAutorizado(tipo, id, usuarioId);

    const imagem = await otimizarImagem(arquivo, tipo);

    const chave = `photo/${tipo}/${id}/${randomUUID()}.webp`;

    await obterClienteR2().send(
      new PutObjectCommand({
        Bucket: obterBucket(),
        Key: chave,
        Body: imagem,
        ContentType: "image/webp",
        CacheControl: "private, max-age=300",
      }),
    );

    let atualizado = false;

    try {
      atualizado = await this.repository.atualizarImagemSeAtual(
        tipo,
        id,
        registro.imagemUrl,
        chave,
      );
    } catch (error) {
      try {
        await removerObjeto(chave);
      } catch (erroLimpeza) {
        console.error("Falha ao limpar upload não confirmado:", erroLimpeza);
      }

      throw error;
    }

    if (!atualizado) {
      try {
        await removerObjeto(chave);
      } catch (erroLimpeza) {
        console.error("Falha ao limpar upload concorrente:", erroLimpeza);
      }

      throw new PhotoError(
        "A foto foi alterada por outra requisição. Tente novamente.",
        409,
      );
    }

    const anterior = registro.imagemUrl;

    if (
      anterior &&
      anterior !== chave &&
      chaveGerenciadaPeloViaU(tipo, id, anterior)
    ) {
      try {
        await removerObjeto(anterior);
      } catch (error) {
        console.error("Falha ao remover foto anterior:", error);
      }
    }

    return {
      imagemUrl: `/api/photo/${tipo}/${id}`,
    };
  }

  async consultar(dados: ConsultarPhotoDTO): Promise<Uint8Array> {
    const { tipo, id, usuarioId } = validarConsultarPhotoDTO(dados);

    const registro = await this.obterRegistroAutorizado(tipo, id, usuarioId);

    if (!registro.imagemUrl) {
      throw new PhotoError("Este registro não possui foto.", 404);
    }

    if (!chaveGerenciadaPeloViaU(tipo, id, registro.imagemUrl)) {
      throw new PhotoError(
        "A foto não está disponível no armazenamento atual.",
        404,
      );
    }

    try {
      const resultado = await obterClienteR2().send(
        new GetObjectCommand({
          Bucket: obterBucket(),
          Key: registro.imagemUrl,
        }),
      );

      if (!resultado.Body) {
        throw new PhotoError("Arquivo de imagem não encontrado.", 404);
      }

      return await resultado.Body.transformToByteArray();
    } catch (error) {
      if (error instanceof PhotoError) {
        throw error;
      }

      if (
        error instanceof Error &&
        (error.name === "NoSuchKey" || error.name === "NotFound")
      ) {
        throw new PhotoError("Arquivo de imagem não encontrado.", 404);
      }

      throw error;
    }
  }

  async excluir(dados: ExcluirPhotoDTO): Promise<void> {
    const { tipo, id, usuarioId } = validarExcluirPhotoDTO(dados);

    const registro = await this.obterRegistroAutorizado(tipo, id, usuarioId);

    if (!registro.imagemUrl) {
      return;
    }

    const atualizado = await this.repository.atualizarImagemSeAtual(
      tipo,
      id,
      registro.imagemUrl,
      null,
    );

    if (!atualizado) {
      throw new PhotoError(
        "A foto foi alterada por outra requisição. Tente novamente.",
        409,
      );
    }

    if (chaveGerenciadaPeloViaU(tipo, id, registro.imagemUrl)) {
      try {
        await removerObjeto(registro.imagemUrl);
      } catch (error) {
        console.error("Falha ao remover objeto do R2:", error);
      }
    }
  }
}

export { PhotoDTOValidationError };
