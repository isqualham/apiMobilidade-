import { z } from "zod";

export const refreshSchema = z.strictObject({
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export interface ParTokens { token: string; refreshToken: string }
export class RefreshInvalidoError extends Error {
  constructor() { super("Refresh token inválido, expirado ou revogado."); }
}
export interface UsuarioSessao {
  id: string; nome: string; email: string; administrador: boolean;
}
