import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { STATUS_ATIVOS } from "@/modules/corrida/ConsultaCorridaDTO";
import type { CategoriasDisponiveisRepository } from "./CategoriasDisponiveisRepository";

export class PrismaCategoriasDisponiveisRepository implements CategoriasDisponiveisRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}
  listar(usuarioId: string) {
    return this.banco.$transaction(async tx => {
      const prestadores = await tx.prestador.findMany({
        where: {
          usuarioId: { not: usuarioId }, statusAprovacao: "APROVADO",
          usuario: { ativo: true, corridasComoPassageiro: { none: { status: { in: STATUS_ATIVOS } } } },
          corridas: { none: { status: { in: STATUS_ATIVOS } } },
          veiculoOnlineId: { not: null },
          veiculoOnline: { is: {
            ativo: true, statusAprovacao: "APROVADO",
            categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true }, tarifas: { some: { ativo: true } } },
          } },
        },
        select: { id: true, veiculoOnline: { select: { prestadorId: true, categoriaVeiculoId: true } } },
      });
      // A FK da seleção, por si só, não garante a propriedade do veículo.
      const ids = [...new Set(prestadores.flatMap(p =>
        p.veiculoOnline?.prestadorId === p.id ? [p.veiculoOnline.categoriaVeiculoId] : []))];
      if (!ids.length) return [];
      return tx.categoriaVeiculo.findMany({
        where: { id: { in: ids } },
        select: { id: true, tipoVeiculoId: true, nome: true, descricao: true, ordemExibicao: true },
        orderBy: [{ ordemExibicao: "asc" }, { nome: "asc" }, { id: "asc" }],
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
