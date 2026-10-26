import { prisma } from "@/lib/prisma";

import type {
  CadastrarVeiculoDTO,
  VeiculoResponseDTO,
} from "./CadastrarVeiculoDTO";

import type { VeiculoRepository } from "./VeiculoRepository";

export class PrismaVeiculoRepository implements VeiculoRepository {
  async cadastrar(
    prestadorId: string,
    dados: CadastrarVeiculoDTO,
  ): Promise<VeiculoResponseDTO> {
    return prisma.veiculo.create({
      data: {
        prestadorId,
        categoriaVeiculoId: dados.categoriaVeiculoId,
        placa: dados.placa,
        marca: dados.marca,
        modelo: dados.modelo,
        ano: dados.ano,
        cor: dados.cor ?? null,
        imagemUrl: dados.imagemUrl ?? null,
        ativo: dados.ativo ?? true,
      },
    });
  }

  async listarPorPrestador(prestadorId: string): Promise<VeiculoResponseDTO[]> {
    return prisma.veiculo.findMany({
      where: {
        prestadorId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async buscarPorPlaca(placa: string): Promise<VeiculoResponseDTO | null> {
    return prisma.veiculo.findUnique({
      where: {
        placa,
      },
    });
  }

  async verificarCategoriaAtiva(categoriaVeiculoId: string): Promise<boolean> {
    const categoria = await prisma.categoriaVeiculo.findFirst({
      where: {
        id: categoriaVeiculoId,
        ativo: true,
        tipoVeiculo: {
          ativo: true,
        },
      },
      select: {
        id: true,
      },
    });

    return categoria !== null;
  }
}
