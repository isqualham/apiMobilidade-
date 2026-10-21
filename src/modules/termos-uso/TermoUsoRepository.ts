export interface CriarTermoUsoDados {
  versao: string;
  conteudo: string;
  ativo: boolean;
}

export interface TermoUso {
  id: string;
  versao: string;
  conteudo: string;
  ativo: boolean;
  createdAt: Date;
}

export interface TermoUsoRepository {
  criar(dados: CriarTermoUsoDados): Promise<TermoUso>;
  buscarVigente(): Promise<TermoUso | null>;
}
