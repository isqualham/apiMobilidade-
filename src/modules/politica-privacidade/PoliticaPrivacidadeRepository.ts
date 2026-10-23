export interface CriarPoliticaPrivacidadeDados {
  versao: string;
  conteudo: string;
  ativo?: boolean;
}

export interface PoliticaPrivacidade {
  id: string;
  versao: string;
  conteudo: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoliticaPrivacidadeRepository {
  criar(dados: CriarPoliticaPrivacidadeDados): Promise<PoliticaPrivacidade>;

  buscarVigente(): Promise<PoliticaPrivacidade | null>;
}
