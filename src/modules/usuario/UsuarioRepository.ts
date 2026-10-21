export interface CriarUsuarioData {
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  senhaHash: string;
}

export interface UsuarioCriado {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  administrador: boolean;
  createdAt: Date;
}

export interface UsuarioParaAutenticacao {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  ativo: boolean;
  administrador: boolean;
  prestador: {
    statusAprovacao: "PENDENTE" | "APROVADO" | "REJEITADO";
  } | null;
}

export interface UsuarioRepository {
  existePorEmail(email: string): Promise<boolean>;
  existePorCPF(cpf: string): Promise<boolean>;
  buscarPorEmail(email: string): Promise<UsuarioParaAutenticacao | null>;
  criarComAceiteTermo(data: CriarUsuarioData): Promise<UsuarioCriado>;
}
