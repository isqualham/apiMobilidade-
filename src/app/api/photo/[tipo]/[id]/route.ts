import { NextRequest, NextResponse } from "next/server";

import {
  autenticarRequisicao,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";

import { PrismaPhotoRepository } from "@/modules/photo/PrismaPhotoRepository";

import { UploadPhotoUseCase } from "@/modules/photo/UploadPhotoUseCase";

import { PhotoError } from "@/modules/photo/PhotoRepository";

import {
  PhotoDTOValidationError,
  PHOTO_MAX_FILE_SIZE,
  validarTipoPhoto,
  validarPhotoId,
} from "@/modules/photo/PhotoDTO";

export const runtime = "nodejs";

const repository = new PrismaPhotoRepository();

const photoUseCase = new UploadPhotoUseCase(repository);

type Contexto = {
  params: Promise<{
    tipo: string;
    id: string;
  }>;
};

function tratarErro(error: unknown) {
  if (error instanceof TokenInvalidoError) {
    return NextResponse.json({ mensagem: error.message }, { status: 401 });
  }

  if (error instanceof AcessoNegadoError) {
    return NextResponse.json({ mensagem: error.message }, { status: 403 });
  }

  if (error instanceof PhotoDTOValidationError) {
    return NextResponse.json(
      { mensagem: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof PhotoError) {
    return NextResponse.json(
      { mensagem: error.message },
      { status: error.statusCode },
    );
  }

  console.error("Erro no módulo Photo:", error);

  return NextResponse.json(
    { mensagem: "Erro interno do servidor." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest, context: Contexto) {
  try {
    const usuario = await autenticarRequisicao(request);

    const { tipo, id } = await context.params;

    const tipoValidado = validarTipoPhoto(tipo);
    const idValidado = validarPhotoId(id);

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      throw new PhotoDTOValidationError(
        "Envie a imagem utilizando multipart/form-data.",
        415,
      );
    }

    const contentLength = request.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) > PHOTO_MAX_FILE_SIZE + 1024 * 1024
    ) {
      throw new PhotoDTOValidationError(
        "A requisição ultrapassou o limite permitido.",
        413,
      );
    }

    let formulario: FormData;

    try {
      formulario = await request.formData();
    } catch {
      throw new PhotoDTOValidationError(
        "Não foi possível interpretar o formulário enviado.",
        400,
      );
    }

    const arquivo = formulario.get("file");

    const resultado = await photoUseCase.enviar({
      tipo: tipoValidado,
      id: idValidado,
      usuarioId: usuario.id,
      arquivo: arquivo as File,
    });

    return NextResponse.json(
      {
        mensagem: "Foto enviada com sucesso.",
        imagemUrl: resultado.imagemUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    return tratarErro(error);
  }
}

export async function GET(request: NextRequest, context: Contexto) {
  try {
    const usuario = await autenticarRequisicao(request);

    const { tipo, id } = await context.params;

    const tipoValidado = validarTipoPhoto(tipo);
    const idValidado = validarPhotoId(id);

    const imagem = await photoUseCase.consultar({
      tipo: tipoValidado,
      id: idValidado,
      usuarioId: usuario.id,
    });

    const corpo = new Uint8Array(imagem).buffer;

    return new Response(corpo, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return tratarErro(error);
  }
}

export async function DELETE(request: NextRequest, context: Contexto) {
  try {
    const usuario = await autenticarRequisicao(request);

    const { tipo, id } = await context.params;

    const tipoValidado = validarTipoPhoto(tipo);
    const idValidado = validarPhotoId(id);

    await photoUseCase.excluir({
      tipo: tipoValidado,
      id: idValidado,
      usuarioId: usuario.id,
    });

    return NextResponse.json(
      {
        mensagem: "Foto removida com sucesso.",
      },
      { status: 200 },
    );
  } catch (error) {
    return tratarErro(error);
  }
}
