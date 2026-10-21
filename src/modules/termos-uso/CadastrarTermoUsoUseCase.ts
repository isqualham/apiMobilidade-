import type { CadastrarTermoUsoDTO } from "./CadastrarTermoUsoDTO";
import type { TermoUso, TermoUsoRepository } from "./TermoUsoRepository";

export class CadastrarTermoUsoUseCase {
  constructor(private readonly termoUsoRepository: TermoUsoRepository) {}

  async executar(dados: CadastrarTermoUsoDTO): Promise<TermoUso> {
    const termoExistente = await this.termoUsoRepository.buscarVigente();

    if (dados.ativo && termoExistente) {
      throw new Error(
        "Já existe um termo ativo. Desative-o antes de cadastrar outro.",
      );
    }

    return this.termoUsoRepository.criar({
      versao: dados.versao,
      conteudo: dados.conteudo,
      ativo: dados.ativo,
    });
  }
}
