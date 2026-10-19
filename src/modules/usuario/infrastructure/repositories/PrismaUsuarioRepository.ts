import { prisma } from "@/lib/prisma";
import type {
  CriarUsuarioData,
  UsuarioCriado,
  UsuarioParaAutenticacao,
  UsuarioRepository,
} from "../../domain/repositories/UsuarioRepository";

export class PrismaUsuarioRepository implements UsuarioRepository {
  async existePorEmail(email: string): Promise<boolean> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    return usuario !== null;
  }

  async buscarPorEmail(email: string): Promise<UsuarioParaAutenticacao | null> {
    return prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        senhaHash: true,
        ativo: true,
      },
    });
  }

  async criar(data: CriarUsuarioData): Promise<UsuarioCriado> {
    return prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        senhaHash: data.senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        ativo: true,
        createdAt: true,
      },
    });
  }
}
