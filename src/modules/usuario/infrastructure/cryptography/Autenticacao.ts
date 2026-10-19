import { verificarToken } from "./TokenService";

export class TokenInvalidoError extends Error {
  constructor() {
    super("Token ausente ou inválido.");
    this.name = "TokenInvalidoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function autenticarRequisicao(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new TokenInvalidoError();
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new TokenInvalidoError();
  }

  try {
    const payload = await verificarToken(token);

    if (
      typeof payload.sub !== "string" ||
      typeof payload.nome !== "string" ||
      typeof payload.email !== "string"
    ) {
      throw new TokenInvalidoError();
    }

    return {
      id: payload.sub,
      nome: payload.nome,
      email: payload.email,
    };
  } catch {
    throw new TokenInvalidoError();
  }
}
