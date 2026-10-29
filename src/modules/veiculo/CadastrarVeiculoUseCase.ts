import { validarDadosVeiculo } from "./ValidarDadosVeiculo";
import type {
  CadastrarVeiculoDTO,
  VeiculoResponseDTO,
} from "./CadastrarVeiculoDTO";

import { ErroVeiculo } from "./CadastrarVeiculoDTO";

import type { VeiculoRepository } from "./VeiculoRepository";

export class CadastrarVeiculoUseCase {
  constructor(private readonly repository: VeiculoRepository) {}

  async executar(
    prestadorId: string,
    dados: CadastrarVeiculoDTO,
  ): Promise<VeiculoResponseDTO> {
    if (!prestadorId) {
      throw new ErroVeiculo("Prestador não identificado.", 401);
    }

    const normalizados = validarDadosVeiculo(dados);
    const categoriaAtiva = await this.repository.verificarCategoriaAtiva(
      dados.categoriaVeiculoId,
    );

    if (!categoriaAtiva) {
      throw new ErroVeiculo(
        "Categoria de veículo inexistente ou inativa.",
        400,
      );
    }

    const veiculoExistente = await this.repository.buscarPorPlaca(normalizados.placa);

    if (veiculoExistente) {
      throw new ErroVeiculo(
        "Já existe um veículo cadastrado com essa placa.",
        409,
      );
    }

    return this.repository.cadastrar(prestadorId, normalizados);
  }
}
