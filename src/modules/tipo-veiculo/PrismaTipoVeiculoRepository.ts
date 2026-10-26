import { prisma } from "@/lib/prisma";
import type { CadastrarTipoVeiculoDTO } from "./CadastrarTipoVeiculoDTO";
import type {
  TipoVeiculo,
  TipoVeiculoRepository,
} from "./TipoVeiculoRepository";

export class PrismaTipoVeiculoRepository implements TipoVeiculoRepository {
  async listarAtivos(): Promise<TipoVeiculo[]> {
    return prisma.tipoVeiculo.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  }

  async buscarPorNome(nome: string): Promise<TipoVeiculo | null> {
    return prisma.tipoVeiculo.findUnique({
      where: { nome },
    });
  }

  async cadastrar(data: CadastrarTipoVeiculoDTO): Promise<TipoVeiculo> {
    return prisma.tipoVeiculo.create({
      data: {
        nome: data.nome,
        descricao: data.descricao ?? null,
        ativo: data.ativo ?? true,
      },
    });
  }
}
