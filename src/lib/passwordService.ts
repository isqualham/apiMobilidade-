import { compare, hash } from "bcryptjs";

export function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha, 12);
}

export function verificarSenha(
  senha: string,
  senhaHash: string,
): Promise<boolean> {
  return compare(senha, senhaHash);
}
