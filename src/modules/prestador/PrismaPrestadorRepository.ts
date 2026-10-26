import { prisma } from "@/lib/prisma";
import { Prisma, StatusAprovacao } from "@/generated/prisma/client";
import { PrestadorError, type AtualizarAprovacaoPrestadorDTO, type AprovacaoPrestadorResponseDTO } from "./AtualizarAprovacaoPrestadorDTO";
import type { PrestadorRepository } from "./PrestadorRepository";

export class PrismaPrestadorRepository implements PrestadorRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}

  async decidirAprovacao(dados: AtualizarAprovacaoPrestadorDTO): Promise<AprovacaoPrestadorResponseDTO> {
    try {
      return await this.banco.$transaction(async (tx) => {
        // Revalidar também aqui para usos do caso de uso fora da API.
        const administrador = await tx.usuario.findFirst({
          where: { id: dados.administradorId, ativo: true, administrador: true },
          select: { id: true },
        });
        if (!administrador) throw new PrestadorError("Acesso permitido somente a administradores ativos.", 403);

        const prestador = await tx.prestador.findUnique({
          where: { id: dados.prestadorId },
          select: { statusAprovacao: true, usuario: { select: { ativo: true } } },
        });
        if (!prestador) throw new PrestadorError("Prestador não encontrado.", 404);
        if (prestador.statusAprovacao !== StatusAprovacao.PENDENTE) {
          throw new PrestadorError("O cadastro já foi avaliado.", 409);
        }
        if (!prestador.usuario.ativo) throw new PrestadorError("O usuário do prestador está inativo.", 409);

        // Compare-and-set: decisões concorrentes nunca sobrescrevem a vencedora.
        const resultado = await tx.prestador.updateMany({
          where: {
            id: dados.prestadorId,
            statusAprovacao: StatusAprovacao.PENDENTE,
            usuario: { ativo: true },
          },
          data: { statusAprovacao: dados.statusAprovacao },
        });
        if (resultado.count !== 1) throw new PrestadorError("O cadastro sofreu uma alteração. Consulte o estado atual.", 409);

        return tx.prestador.findUniqueOrThrow({
          where: { id: dados.prestadorId },
          select: { id: true, usuarioId: true, statusAprovacao: true, updatedAt: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2025"].includes(erro.code)) {
        throw new PrestadorError("Conflito ao avaliar o prestador. Consulte o estado atual.", 409);
      }
      throw erro;
    }
  }
}
