import type { CadastrarCategoriaVeiculoDTO } from "./CadastrarCategoriaVeiculoDTO";
import type {
  CategoriaVeiculo,
  CategoriaVeiculoRepository,
} from "./CategoriaVeiculoRepository";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CadastrarCategoriaVeiculoUseCase {
  constructor(private readonly repository: CategoriaVeiculoRepository) {}

  async executar(
    entrada: CadastrarCategoriaVeiculoDTO,
  ): Promise<CategoriaVeiculo> {
    if (
      !entrada ||
      typeof entrada.tipoVeiculoId !== "string" ||
      !UUID_REGEX.test(entrada.tipoVeiculoId)
    ) {
      throw new Error("O ID do tipo de veículo é inválido.");
    }

    if (typeof entrada.nome !== "string" || !entrada.nome.trim()) {
      throw new Error("O nome da categoria é obrigatório.");
    }

    const nome = entrada.nome.trim();

    if (nome.length > 100) {
      throw new Error("O nome deve ter no máximo 100 caracteres.");
    }

    if (
      entrada.descricao !== undefined &&
      entrada.descricao !== null &&
      typeof entrada.descricao !== "string"
    ) {
      throw new Error("A descrição deve ser um texto.");
    }

    const descricao = entrada.descricao?.trim() || null;

    if (descricao && descricao.length > 255) {
      throw new Error("A descrição deve ter no máximo 255 caracteres.");
    }

    if (entrada.ativo !== undefined && typeof entrada.ativo !== "boolean") {
      throw new Error("O campo ativo deve ser booleano.");
    }

    if (
      entrada.ordemExibicao !== undefined &&
      (!Number.isInteger(entrada.ordemExibicao) ||
        entrada.ordemExibicao < 0 ||
        entrada.ordemExibicao > 2147483647)
    ) {
      throw new Error("A ordem de exibição deve ser um inteiro não negativo.");
    }

    const tipoExiste = await this.repository.tipoVeiculoAtivoExiste(
      entrada.tipoVeiculoId,
    );

    if (!tipoExiste) {
      throw new Error("O tipo de veículo informado não está ativo.");
    }

    const existente = await this.repository.buscarPorNome(nome);

    if (existente) {
      throw new Error("Já existe uma categoria com esse nome.");
    }

    return this.repository.cadastrar({
      tipoVeiculoId: entrada.tipoVeiculoId,
      nome,
      descricao,
      ativo: entrada.ativo ?? true,
      ordemExibicao: entrada.ordemExibicao ?? 0,
    });
  }
}
