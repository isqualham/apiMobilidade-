import { createHash, randomBytes } from "node:crypto";
import type { SessaoRepository } from "./SessaoRepository";
import { RefreshInvalidoError, type ParTokens, type UsuarioSessao } from "./SessaoDTO";
import { gerarToken } from "./TokenService";

export function hashRefresh(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function novoRefresh() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashRefresh(token), expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}
export class SessaoUseCase {
  constructor(private readonly repository: SessaoRepository) {}
  async criar(usuario: UsuarioSessao): Promise<ParTokens> {
    const refresh = novoRefresh();
    const sid = await this.repository.criar(usuario.id, refresh.hash, refresh.expiraEm);
    const token = await gerarToken({ ...usuario, sub: usuario.id, sid });
    return { token, refreshToken: refresh.token };
  }
  async renovar(refreshToken: string): Promise<ParTokens> {
    const novo = novoRefresh();
    const resultado = await this.repository.rotacionar(hashRefresh(refreshToken), novo.hash, novo.expiraEm);
    if (!resultado) throw new RefreshInvalidoError();
    const token = await gerarToken({ ...resultado.usuario, sub: resultado.usuario.id, sid: resultado.sessaoId });
    return { token, refreshToken: novo.token };
  }
  async logout(refreshToken: string): Promise<void> {
    await this.repository.revogar(hashRefresh(refreshToken));
  }
}
