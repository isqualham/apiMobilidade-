import { prisma } from "@/lib/prisma";

import type {
  PhotoRegistro,
  PhotoRepository,
  TipoPhoto,
} from "./PhotoRepository";

export class PrismaPhotoRepository implements PhotoRepository {
  async buscar(tipo: TipoPhoto, id: string): Promise<PhotoRegistro | null> {
    if (tipo === "usuario") {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: {
          id: true,
          imagemUrl: true,
        },
      });

      if (!usuario) return null;

      return {
        id: usuario.id,
        imagemUrl: usuario.imagemUrl,
        proprietarioUsuarioId: usuario.id,
      };
    }

    const veiculo = await prisma.veiculo.findUnique({
      where: { id },
      select: {
        id: true,
        imagemUrl: true,
        prestador: {
          select: {
            usuarioId: true,
          },
        },
      },
    });

    if (!veiculo) return null;

    return {
      id: veiculo.id,
      imagemUrl: veiculo.imagemUrl,
      proprietarioUsuarioId: veiculo.prestador.usuarioId,
    };
  }

  async atualizarImagem(
    tipo: TipoPhoto,
    id: string,
    imagemUrl: string | null,
  ): Promise<void> {
    if (tipo === "usuario") {
      await prisma.usuario.update({
        where: { id },
        data: { imagemUrl },
      });
      return;
    }

    await prisma.veiculo.update({
      where: { id },
      data: { imagemUrl },
    });
  }

  async atualizarImagemSeAtual(
    tipo: TipoPhoto,
    id: string,
    imagemAtual: string | null,
    novaImagem: string | null,
  ): Promise<boolean> {
    if (tipo === "usuario") {
      const resultado = await prisma.usuario.updateMany({
        where: {
          id,
          imagemUrl: imagemAtual,
        },
        data: {
          imagemUrl: novaImagem,
        },
      });

      return resultado.count === 1;
    }

    const resultado = await prisma.veiculo.updateMany({
      where: {
        id,
        imagemUrl: imagemAtual,
      },
      data: {
        imagemUrl: novaImagem,
      },
    });

    return resultado.count === 1;
  }
}
