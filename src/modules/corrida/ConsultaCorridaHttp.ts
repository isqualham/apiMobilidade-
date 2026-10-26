import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError, AcessoNegadoError } from "@/modules/auth/AutenticarRequisicao";
import { CorridaError } from "./CorridaDTO";
import { ConsultarCorridasUseCase } from "./ConsultarCorridasUseCase";
import { PrismaCorridaConsultaRepository } from "./PrismaCorridaConsultaRepository";

export const consultarCorridas = new ConsultarCorridasUseCase(new PrismaCorridaConsultaRepository());
export async function responderConsultaCorrida(
  request: Request,
  executar: (usuarioId: string, params: URLSearchParams) => Promise<unknown>,
) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    const usuario = await autenticarRequisicao(request);
    const resultado = await executar(usuario.id, new URL(request.url).searchParams);
    return NextResponse.json(resultado, { headers });
  } catch (erro) {
    let status = 500;
    let mensagem = "Não foi possível consultar corridas.";
    if (erro instanceof TokenInvalidoError) { status = 401; mensagem = erro.message; }
    else if (erro instanceof AcessoNegadoError) { status = 403; mensagem = erro.message; }
    else if (erro instanceof CorridaError) { status = erro.statusCode; mensagem = erro.message; }
    else console.error("Erro ao consultar corridas:", erro);
    return NextResponse.json({ mensagem }, { status, headers });
  }
}
