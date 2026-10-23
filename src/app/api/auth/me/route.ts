import { NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/auth/AutenticarRequisicao";

export async function GET(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);

    console.log("Usuário retornado em /api/auth/me:", usuario);
    return NextResponse.json(usuario, { status: 200 });
  } catch (erro: unknown) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    console.error("Erro ao consultar usuário autenticado:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar o usuário." },
      { status: 500 },
    );
  }
}
