import type { CadastrarTipoVeiculoDTO } from "./CadastrarTipoVeiculoDTO";
import type {
  TipoVeiculo,
  TipoVeiculoRepository,
} from "./TipoVeiculoRepository";

export class CadastrarTipoVeiculoUseCase {
  constructor(private readonly repository: TipoVeiculoRepository) {}

  async executar(entrada: CadastrarTipoVeiculoDTO): Promise<TipoVeiculo> {
    if (!entrada || typeof entrada.nome !== "string" || !entrada.nome.trim()) {
      throw new Error("O nome do tipo de veículo é obrigatório.");
    }

    const nome = entrada.nome.trim();

    if (nome.length > 80) {
      throw new Error("O nome deve ter no máximo 80 caracteres.");
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

    const existente = await this.repository.buscarPorNome(nome);

    if (existente) {
      throw new Error("Já existe um tipo de veículo com esse nome.");
    }

    return this.repository.cadastrar({
      nome,
      descricao,
      ativo: entrada.ativo ?? true,
    });
  }
}
