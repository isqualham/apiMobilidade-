import { SignJWT, jwtVerify } from "jose";

function obterChaveSecreta(): Uint8Array {
  const segredo = process.env.JWT_SECRET;

  if (!segredo) {
    throw new Error("JWT_SECRET não foi configurado.");
  }

  return new TextEncoder().encode(segredo);
}

export interface DadosToken {
  sub: string;
  nome: string;
  email: string;
  administrador: boolean;
}

export async function gerarToken(dados: DadosToken): Promise<string> {
  return new SignJWT({
    nome: dados.nome,
    email: dados.email,
    administrador: dados.administrador,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(dados.sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(obterChaveSecreta());
}

export async function verificarToken(token: string) {
  const { payload } = await jwtVerify(token, obterChaveSecreta(), {
    algorithms: ["HS256"],
  });

  return payload;
}
