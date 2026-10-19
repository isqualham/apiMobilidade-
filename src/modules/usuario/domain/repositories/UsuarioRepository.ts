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

export interface UsuarioRepository {
  existePorEmail(email: string): Promise<boolean>;
  criar(data: CriarUsuarioData): Promise<UsuarioCriado>;
}
