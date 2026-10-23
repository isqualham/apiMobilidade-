import type {
  PoliticaPrivacidadeRepository,
  PoliticaPrivacidade,
} from "./PoliticaPrivacidadeRepository";
import type { CadastrarPoliticaPrivacidadeDTO } from "./CadastrarPoliticaPrivacidadeDTO";

export class CadastrarPoliticaPrivacidadeUseCase {
  constructor(
    private readonly politicaPrivacidadeRepository: PoliticaPrivacidadeRepository,
  ) {}

  async executar(
    dados: CadastrarPoliticaPrivacidadeDTO,
  ): Promise<PoliticaPrivacidade> {
    return this.politicaPrivacidadeRepository.criar(dados);
  }
}
