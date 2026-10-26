import type { CadastrarTarifaCategoriaDTO } from "./CadastrarTarifaCategoriaDTO";
import type {
  TarifaCategoria,
  TarifaCategoriaRepository,
} from "./TarifaCategoriaRepository";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CadastrarTarifaCategoriaUseCase {
  constructor(private readonly repository: TarifaCategoriaRepository) {}

  async executar(
    entrada: CadastrarTarifaCategoriaDTO,
  ): Promise<TarifaCategoria> {
    if (
      !entrada ||
      typeof entrada.categoriaVeiculoId !== "string" ||
      !UUID_REGEX.test(entrada.categoriaVeiculoId)
    ) {
      throw new Error("O ID da categoria é inválido.");
    }

    const validarValor = (
      valor: unknown,
      nome: string,
      obrigatoriamentePositivo: boolean,
    ) => {
      if (
        typeof valor !== "number" ||
        !Number.isFinite(valor) ||
        valor < 0 ||
        (obrigatoriamentePositivo && valor === 0) ||
        valor > 99999999.99 ||
        Math.abs(valor * 100 - Math.round(valor * 100)) > 0.000001
      ) {
        throw new Error(
          `${nome} deve ser um valor monetário válido com até duas casas decimais.`,
        );
      }
    };

    validarValor(entrada.valorKm, "O valor por km", true);
    validarValor(entrada.tarifaMinima, "A tarifa mínima", true);
    validarValor(entrada.taxaPartida ?? 0, "A taxa de partida", false);

    if (entrada.ativo !== undefined && typeof entrada.ativo !== "boolean") {
      throw new Error("O campo ativo deve ser booleano.");
    }

    const categoriaExiste = await this.repository.categoriaAtivaExiste(
      entrada.categoriaVeiculoId,
    );

    if (!categoriaExiste) {
      throw new Error("A categoria informada não existe ou não está ativa.");
    }

    const existente = await this.repository.buscarPorCategoria(
      entrada.categoriaVeiculoId,
    );

    if (existente) {
      throw new Error("Já existe uma tarifa cadastrada para essa categoria.");
    }

    return this.repository.cadastrar({
      categoriaVeiculoId: entrada.categoriaVeiculoId,
      valorKm: entrada.valorKm,
      tarifaMinima: entrada.tarifaMinima,
      taxaPartida: entrada.taxaPartida ?? 0,
      ativo: entrada.ativo ?? true,
    });
  }
}
