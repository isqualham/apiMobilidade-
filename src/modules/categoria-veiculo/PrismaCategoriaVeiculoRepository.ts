import { prisma } from "@/lib/prisma";
import type { CadastrarCategoriaVeiculoDTO } from "./CadastrarCategoriaVeiculoDTO";
import type {
  CategoriaVeiculo,
  CategoriaVeiculoRepository,
} from "./CategoriaVeiculoRepository";

export class PrismaCategoriaVeiculoRepository implements CategoriaVeiculoRepository {
  async listarAtivas(): Promise<CategoriaVeiculo[]> {
    return prisma.categoriaVeiculo.findMany({
      where: {
        ativo: true,
        tipoVeiculo: { ativo: true },
      },
      orderBy: [{ ordemExibicao: "asc" }, { nome: "asc" }],
    });
  }

  async buscarPorNome(nome: string): Promise<CategoriaVeiculo | null> {
    return prisma.categoriaVeiculo.findUnique({
      where: { nome },
    });
  }

  async tipoVeiculoAtivoExiste(id: string): Promise<boolean> {
    const tipo = await prisma.tipoVeiculo.findFirst({
      where: { id, ativo: true },
      select: { id: true },
    });

    return tipo !== null;
  }

  async cadastrar(
    data: CadastrarCategoriaVeiculoDTO,
  ): Promise<CategoriaVeiculo> {
    return prisma.categoriaVeiculo.create({
      data: {
        tipoVeiculoId: data.tipoVeiculoId,
        nome: data.nome,
        descricao: data.descricao ?? null,
        ativo: data.ativo ?? true,
        ordemExibicao: data.ordemExibicao ?? 0,
      },
    });
  }
}
