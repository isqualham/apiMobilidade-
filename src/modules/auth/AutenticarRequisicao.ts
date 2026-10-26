import { prisma } from "@/lib/prisma";
import { verificarToken } from "./TokenService";

export class TokenInvalidoError extends Error {
  constructor() {
    super("Token ausente ou inválido.");
    this.name = "TokenInvalidoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AcessoNegadoError extends Error {
  constructor() {
    super("Você não tem permissão para acessar este recurso.");
    this.name = "AcessoNegadoError";
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

  let payload;

  try {
    payload = await verificarToken(token);
  } catch {
    throw new TokenInvalidoError();
  }

  if (typeof payload.sub !== "string") {
    throw new TokenInvalidoError();
  }

  // JWTs anteriores à implantação continuam válidos até sua expiração original.
  if (payload.sid !== undefined) {
    if (typeof payload.sid !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sid)) {
      throw new TokenInvalidoError();
    }
    const sessao = await prisma.sessaoAuth.findFirst({ where: {
      id: payload.sid, usuarioId: payload.sub, revogadaEm: null, expiraEm: { gt: new Date() },
    }, select: { id: true } });
    if (!sessao) throw new TokenInvalidoError();
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      administrador: true,
      telefoneVerificado: true,
      prestador: {
        select: {
          statusAprovacao: true,
        },
      },
    },
  });

  if (!usuario || !usuario.ativo) {
    throw new TokenInvalidoError();
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    administrador: usuario.administrador,
    telefoneVerificado: usuario.telefoneVerificado,
    prestador: usuario.prestador !== null,
    statusAprovacao: usuario.prestador?.statusAprovacao ?? null,
  };
}

export async function exigirAdministrador(request: Request) {
  const usuario = await autenticarRequisicao(request);

  if (!usuario.administrador) {
    throw new AcessoNegadoError();
  }

  return usuario;
}
