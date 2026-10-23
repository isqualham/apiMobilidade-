import { prisma } from "@/lib/prisma";
import type {
  CriarPoliticaPrivacidadeDados,
  PoliticaPrivacidade,
  PoliticaPrivacidadeRepository,
} from "./PoliticaPrivacidadeRepository";

export class PrismaPoliticaPrivacidadeRepository implements PoliticaPrivacidadeRepository {
  async criar(
    dados: CriarPoliticaPrivacidadeDados,
  ): Promise<PoliticaPrivacidade> {
    return prisma.politicaPrivacidade.create({
      data: dados,
    });
  }

  async buscarVigente(): Promise<PoliticaPrivacidade | null> {
    return prisma.politicaPrivacidade.findFirst({
      where: {
        ativo: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
