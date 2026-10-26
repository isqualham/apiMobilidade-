import { prisma } from "@/lib/prisma";
import type { CadastrarTarifaCategoriaDTO } from "./CadastrarTarifaCategoriaDTO";
import type {
  TarifaCategoria,
  TarifaCategoriaRepository,
} from "./TarifaCategoriaRepository";

export class PrismaTarifaCategoriaRepository implements TarifaCategoriaRepository {
  private converter(tarifa: {
    id: string;
    categoriaVeiculoId: string;
    valorKm: { toString(): string };
    tarifaMinima: { toString(): string };
    taxaPartida: { toString(): string };
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): TarifaCategoria {
    return {
      id: tarifa.id,
      categoriaVeiculoId: tarifa.categoriaVeiculoId,
      valorKm: Number(tarifa.valorKm.toString()),
      tarifaMinima: Number(tarifa.tarifaMinima.toString()),
      taxaPartida: Number(tarifa.taxaPartida.toString()),
      ativo: tarifa.ativo,
      createdAt: tarifa.createdAt,
      updatedAt: tarifa.updatedAt,
    };
  }

  async listarAtivas(): Promise<TarifaCategoria[]> {
    const tarifas = await prisma.tarifaCategoria.findMany({
      where: {
        ativo: true,
        categoriaVeiculo: {
          ativo: true,
          tipoVeiculo: { ativo: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return tarifas.map((tarifa) => this.converter(tarifa));
  }

  async buscarPorCategoria(
    categoriaVeiculoId: string,
  ): Promise<TarifaCategoria | null> {
    const tarifa = await prisma.tarifaCategoria.findUnique({
      where: { categoriaVeiculoId },
    });

    return tarifa ? this.converter(tarifa) : null;
  }

  async categoriaAtivaExiste(id: string): Promise<boolean> {
    const categoria = await prisma.categoriaVeiculo.findFirst({
      where: {
        id,
        ativo: true,
        tipoVeiculo: { ativo: true },
      },
      select: { id: true },
    });

    return categoria !== null;
  }

  async cadastrar(data: CadastrarTarifaCategoriaDTO): Promise<TarifaCategoria> {
    const tarifa = await prisma.tarifaCategoria.create({
      data: {
        categoriaVeiculoId: data.categoriaVeiculoId,
        valorKm: data.valorKm.toFixed(2),
        tarifaMinima: data.tarifaMinima.toFixed(2),
        taxaPartida: (data.taxaPartida ?? 0).toFixed(2),
        ativo: data.ativo ?? true,
      },
    });

    return this.converter(tarifa);
  }
}
