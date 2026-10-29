import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessaoRepository } from "./SessaoRepository";
import { RefreshInvalidoError, SessaoAtivaError } from "./SessaoDTO";

export class PrismaSessaoRepository implements SessaoRepository {
  constructor(private readonly banco: PrismaClient = prisma) {}

  async criar(usuarioId: string, tokenHash: string, expiraEm: Date) {
    return this.banco.$transaction(async (tx) => {
      // Lock da conta serializa inclusive logins em processos/dispositivos distintos.
      const conta = await tx.usuario.updateMany({
        where: { id: usuarioId, ativo: true }, data: { updatedAt: new Date() },
      });
      if (!conta.count) throw new RefreshInvalidoError();
      const agora = new Date();
      // O predicado é reavaliado após aguardar um refresh concorrente no PostgreSQL.
      await tx.sessaoAuth.updateMany({
        where: { usuarioId, revogadaEm: null, expiraEm: { lte: agora } },
        data: { revogadaEm: agora, motivoRevogacao: "EXPIRADA" },
      });
      const ativa = await tx.sessaoAuth.findFirst({
        where: { usuarioId, revogadaEm: null, expiraEm: { gt: agora } },
        select: { id: true },
      });
      // Lançar dentro da transação desfaz inclusive o UPDATE usado para bloquear a conta.
      if (ativa) throw new SessaoAtivaError();
      const sessao = await tx.sessaoAuth.create({ data: {
        usuarioId, expiraEm, tokens: { create: { tokenHash, expiraEm } },
      } });
      return sessao.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async rotacionar(tokenHash: string, novoHash: string, expiraEm: Date) {
    return this.banco.$transaction(async (tx) => {
      const referencia = await tx.refreshToken.findUnique({ where: { tokenHash }, select: { sessaoId: true } });
      if (!referencia) return null;

      // UPDATE adquire o lock da sessão até o commit, inclusive entre processos.
      // ReadCommitted permite reler o token após aguardar outra renovação/logout.
      const lock = await tx.sessaoAuth.updateMany({
        where: { id: referencia.sessaoId, revogadaEm: null }, data: { updatedAt: new Date() },
      });
      if (!lock.count) {
        const anterior = await tx.sessaoAuth.findUnique({
          where: { id: referencia.sessaoId }, select: { motivoRevogacao: true },
        });
        if (anterior?.motivoRevogacao === "OUTRO_LOGIN") {
          throw new RefreshInvalidoError("Sua conta foi acessada em outro dispositivo.");
        }
        return null;
      }
      const agora = new Date();
      const token = await tx.refreshToken.findUniqueOrThrow({ where: { tokenHash }, include: {
        sessao: { include: { usuario: { select: { id: true, nome: true, email: true, administrador: true, ativo: true } } } },
      } });
      const sessao = token.sessao;
      if (token.usadoEm || token.expiraEm <= agora || sessao.expiraEm <= agora || !sessao.usuario.ativo) {
        await tx.sessaoAuth.update({ where: { id: sessao.id }, data: { revogadaEm: agora } });
        // Não lançar aqui: a revogação precisa COMMITAR antes do HTTP 401.
        return null;
      }
      await tx.refreshToken.update({ where: { id: token.id }, data: { usadoEm: agora } });
      await tx.refreshToken.create({ data: { sessaoId: sessao.id, tokenHash: novoHash, expiraEm } });
      await tx.sessaoAuth.update({ where: { id: sessao.id }, data: { expiraEm } });
      return { sessaoId: sessao.id, usuario: sessao.usuario };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async revogar(tokenHash: string) {
    await this.banco.$transaction(async (tx) => {
      const token = await tx.refreshToken.findUnique({ where: { tokenHash }, select: { sessaoId: true } });
      if (!token) return;
      // Mesmo lock da rotação; uma repetição não derruba uma nova seleção Online.
      const revogacao = await tx.sessaoAuth.updateMany({
        where: { id: token.sessaoId, revogadaEm: null }, data: { revogadaEm: new Date() },
      });
      if (!revogacao.count) return;
      const sessao = await tx.sessaoAuth.findUniqueOrThrow({
        where: { id: token.sessaoId }, select: { usuarioId: true },
      });
      // Disponibilidade é global à conta. Corridas não são alteradas.
      await tx.prestador.updateMany({
        where: { usuarioId: sessao.usuarioId, veiculoOnlineId: { not: null } },
        data: { veiculoOnlineId: null, disponibilidadeVersao: { increment: 1 } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }
}
