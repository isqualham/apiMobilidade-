import type { UsuarioSessao } from "./SessaoDTO";

export interface SessaoRepository {
  criar(usuarioId: string, tokenHash: string, expiraEm: Date): Promise<string>;
  rotacionar(tokenHash: string, novoHash: string, expiraEm: Date): Promise<{ sessaoId: string; usuario: UsuarioSessao } | null>;
  revogar(tokenHash: string): Promise<void>;
}
