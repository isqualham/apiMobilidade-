import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { CorridaError } from "./CorridaDTO";
import { STATUS_ATIVOS } from "./ConsultaCorridaDTO";
import type { RecusaOfertaRepository } from "./RecusaOfertaRepository";
import type { RecusarOfertaDTO, RecusaOfertaResponseDTO } from "./RecusarOfertaDTO";
import { conflitoDisponibilidade } from "@/modules/prestador/ConflitoDisponibilidade";
export class PrismaRecusaOfertaRepository implements RecusaOfertaRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}
  async recusar({ usuarioId, corridaId }: RecusarOfertaDTO): Promise<RecusaOfertaResponseDTO> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.banco.$transaction(async tx => {
          const p = await tx.prestador.findFirst({ where: { usuarioId, statusAprovacao: "APROVADO", usuario: { ativo: true } }, select: { id: true, veiculoOnlineId: true } });
          if (!p) throw new CorridaError("Somente prestadores ativos e aprovados podem recusar ofertas.", 403);
          const chave = { prestadorId: p.id, corridaId };
          const existente = await tx.recusaOferta.findUnique({ where: { prestadorId_corridaId: chave } });
          // Repetição confirma somente uma recusa própria já registrada, mesmo após mudança da oferta.
          if (existente) return { corridaId, recusada: true as const, recusadaEm: existente.createdAt.toISOString() };
          if (!p.veiculoOnlineId) throw new CorridaError("Fique Online para recusar ofertas.", 403);
          const v = await tx.veiculo.findFirst({ where: { id: p.veiculoOnlineId, prestadorId: p.id, ativo: true, statusAprovacao: "APROVADO", categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } }, select: { categoriaVeiculoId: true } });
          if (!v) throw new CorridaError("Veículo selecionado inelegível.", 403);
          if (await tx.corrida.findFirst({ where: { prestadorId: p.id, status: { in: STATUS_ATIVOS } }, select: { id: true } })) throw new CorridaError("Prestador já possui corrida ativa.", 409);
          const corrida = await tx.corrida.findFirst({ where: { id: corridaId, categoriaVeiculoId: v.categoriaVeiculoId, passageiroId: { not: usuarioId }, passageiro: { ativo: true } }, select: { status: true, prestadorId: true } });
          if (!corrida) throw new CorridaError("Oferta não encontrada para este prestador.", 404);
          if (corrida.status !== "SOLICITADA" || corrida.prestadorId !== null) throw new CorridaError("Oferta não está mais disponível.", 409);
          const recusa = await tx.recusaOferta.create({ data: chave });
          return { corridaId, recusada: true as const, recusadaEm: recusa.createdAt.toISOString() };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (erro) {
        const conflito = conflitoDisponibilidade(erro) || erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
        if (!conflito) throw erro;
        if (tentativa === 2) throw new CorridaError("Conflito ao recusar oferta. Consulte novamente.", 409);
      }
    }
    throw new CorridaError("Não foi possível recusar oferta.", 409);
  }
}
