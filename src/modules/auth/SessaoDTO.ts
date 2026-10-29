import { z } from "zod";

export const refreshSchema = z.strictObject({
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export interface ParTokens { token: string; refreshToken: string }
export class RefreshInvalidoError extends Error {
  constructor(mensagem = "Refresh token inválido, expirado ou revogado.") { super(mensagem); }
}
export interface UsuarioSessao {
  id: string; nome: string; email: string; administrador: boolean;
}

export class SessaoAtivaError extends Error {
  readonly codigo = "SESSAO_ATIVA_EXISTENTE";
  constructor() {
    super("Esta conta já está conectada em outro dispositivo. Saia do dispositivo atual para entrar aqui.");
  }
}
