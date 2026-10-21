import { prisma } from "@/lib/prisma";
import type {
  CriarTermoUsoDados,
  TermoUso,
  TermoUsoRepository,
} from "./TermoUsoRepository";

export class PrismaTermoUsoRepository implements TermoUsoRepository {
  async criar(dados: CriarTermoUsoDados): Promise<TermoUso> {
    return prisma.termoUso.create({
      data: dados,
    });
  }

  async buscarVigente(): Promise<TermoUso | null> {
    return prisma.termoUso.findFirst({
      where: { ativo: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
