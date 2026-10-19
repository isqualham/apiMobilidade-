export interface CriarUsuarioData {
  nome: string;
  email: string;
  telefone: string | null;
  senhaHash: string;
}

export interface UsuarioCriado {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  createdAt: Date;
}

export interface UsuarioParaAutenticacao {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  ativo: boolean;
}

export interface UsuarioRepository {
  existePorEmail(email: string): Promise<boolean>;
  buscarPorEmail(email: string): Promise<UsuarioParaAutenticacao | null>;
  criar(data: CriarUsuarioData): Promise<UsuarioCriado>;
}
