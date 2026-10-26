import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessaoRepository } from "./SessaoRepository";
import { RefreshInvalidoError } from "./SessaoDTO";

export class PrismaSessaoRepository implements SessaoRepository {
  constructor(private readonly banco: PrismaClient = prisma) {}

  async criar(usuarioId: string, tokenHash: string, expiraEm: Date) {
    return this.banco.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { id: usuarioId }, select: { ativo: true } });
      if (!usuario?.ativo) throw new RefreshInvalidoError();
      const sessao = await tx.sessaoAuth.create({ data: {
        usuarioId, expiraEm, tokens: { create: { tokenHash, expiraEm } },
      } });
      return sessao.id;
    });
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
      if (!lock.count) return null;
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
    const token = await this.banco.refreshToken.findUnique({ where: { tokenHash }, select: { sessaoId: true } });
    if (token) {
      // Mesmo lock da rotação. Aceita token antigo para logout após resposta perdida.
      await this.banco.sessaoAuth.updateMany({
        where: { id: token.sessaoId, revogadaEm: null }, data: { revogadaEm: new Date() },
      });
    }
  }
}
