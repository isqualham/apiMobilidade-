import { conflitoDisponibilidade } from "./ConflitoDisponibilidade";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { DisponibilidadePrestadorRepository } from "./DisponibilidadePrestadorRepository";
import type { AlterarDisponibilidadeDTO, DisponibilidadePrestadorDTO } from "./DisponibilidadePrestadorDTO";
import { PrestadorError } from "./AtualizarAprovacaoPrestadorDTO";
import { STATUS_ATIVOS } from "@/modules/corrida/ConsultaCorridaDTO";
const select = { id: true, statusAprovacao: true, veiculoOnlineId: true, disponibilidadeVersao: true } satisfies Prisma.PrestadorSelect;
function resposta(p: { veiculoOnlineId: string | null; disponibilidadeVersao: number }): DisponibilidadePrestadorDTO {
  return { status: p.veiculoOnlineId ? "ONLINE" : "OFFLINE", veiculoId: p.veiculoOnlineId, versao: p.disponibilidadeVersao };
}
export class PrismaDisponibilidadePrestadorRepository implements DisponibilidadePrestadorRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}
  async consultar(usuarioId: string) {
    const p = await this.banco.prestador.findFirst({ where: { usuarioId, usuario: { ativo: true } }, select });
    if (!p) throw new PrestadorError("Prestador não encontrado ou usuário inativo.", 403);
    return resposta(p);
  }
  async alterar(usuarioId: string, dados: AlterarDisponibilidadeDTO) {
    try {
      return await this.banco.$transaction(async tx => {
        const p = await tx.prestador.findFirst({ where: { usuarioId, usuario: { ativo: true } }, select });
        if (!p) throw new PrestadorError("Prestador não encontrado ou usuário inativo.", 403);
        if (p.disponibilidadeVersao !== dados.versao) throw new PrestadorError("Disponibilidade alterada por outra requisição. Consulte novamente.", 409);
        // Também impede ficar Online enquanto o usuário viaja como passageiro.
        const corrida = await tx.corrida.findFirst({ where: {
          status: { in: STATUS_ATIVOS }, OR: [{ prestadorId: p.id }, { passageiroId: usuarioId }],
        }, select: { id: true } });
        if (corrida) throw new PrestadorError("Não é possível alterar disponibilidade durante uma corrida ativa.", 409);
        const veiculoId = dados.status === "ONLINE" ? dados.veiculoId : null;
        if (dados.status === "ONLINE") {
          if (p.statusAprovacao !== "APROVADO") throw new PrestadorError("Prestador precisa estar aprovado para ficar Online.", 403);
          const veiculo = await tx.veiculo.findFirst({ where: {
            id: veiculoId!, prestadorId: p.id, ativo: true,
            categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } },
          }, select: { id: true } });
          if (!veiculo) throw new PrestadorError("Selecione um veículo próprio, ativo e de categoria e tipo ativos.", 403);
        }
        if (p.veiculoOnlineId === veiculoId) return resposta(p);
        const alterados = await tx.prestador.updateMany({ where: { id: p.id, disponibilidadeVersao: dados.versao },
          data: { veiculoOnlineId: veiculoId, disponibilidadeVersao: { increment: 1 } } });
        if (alterados.count !== 1) throw new PrestadorError("Conflito de disponibilidade. Consulte novamente.", 409);
        return resposta({ veiculoOnlineId: veiculoId, disponibilidadeVersao: p.disponibilidadeVersao + 1 });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (erro) {
      if (conflitoDisponibilidade(erro)) {
        throw new PrestadorError("Conflito de disponibilidade. Consulte novamente.", 409);
      }
      throw erro;
    }
  }
}
