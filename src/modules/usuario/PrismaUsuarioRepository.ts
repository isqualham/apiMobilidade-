import { prisma } from "@/lib/prisma";
import type {
  CriarUsuarioData,
  UsuarioCriado,
  UsuarioParaAutenticacao,
  UsuarioRepository,
} from "./UsuarioRepository";

export class PrismaUsuarioRepository implements UsuarioRepository {
  async existePorEmail(email: string): Promise<boolean> {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    return usuario !== null;
  }

  async existePorCPF(cpf: string): Promise<boolean> {
    const usuario = await prisma.usuario.findUnique({
      where: { cpf },
      select: { id: true },
    });

    return usuario !== null;
  }

  async existePorTelefone(telefone: string): Promise<boolean> {
    const usuario = await prisma.usuario.findUnique({
      where: { telefone },
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
        administrador: true,
        telefoneVerificado: true,
        prestador: {
          select: {
            statusAprovacao: true,
          },
        },
      },
    });
  }

  async criarComAceiteTermo(data: CriarUsuarioData): Promise<UsuarioCriado> {
    return prisma.$transaction(async (tx) => {
      const termo = await tx.termoUso.findFirst({
        where: { ativo: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (!termo) {
        throw new Error("Não há Termos de Uso ativos cadastrados.");
      }

      const usuario = await tx.usuario.create({
        data: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          telefone: data.telefone,
          senhaHash: data.senhaHash,
          administrador: false,
        },
        select: {
          id: true,
          nome: true,
          cpf: true,
          email: true,
          telefone: true,
          ativo: true,
          administrador: true,
          createdAt: true,
        },
      });

      await tx.aceiteTermoUso.create({
        data: {
          usuarioId: usuario.id,
          termoUsoId: termo.id,
        },
      });

      return usuario;
    });
  }
}
