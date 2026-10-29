import { diagnosticarOfertas } from "./DiagnosticoOfertas";
import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError, AcessoNegadoError } from "@/modules/auth/AutenticarRequisicao";
import { CorridaError } from "./CorridaDTO";
import { ConsultarCorridasUseCase } from "./ConsultarCorridasUseCase";
import { PrismaCorridaConsultaRepository } from "./PrismaCorridaConsultaRepository";

export const consultarCorridas = new ConsultarCorridasUseCase(new PrismaCorridaConsultaRepository());
export async function responderConsultaCorrida(
  request: Request,
  executar: (usuarioId: string, params: URLSearchParams) => Promise<unknown>,
  ofertas = false,
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
    else if (!ofertas) console.error("Erro ao consultar corridas:", erro);
    // Ofertas não registram exceções brutas: podem conter parâmetros SQL e dados privados.
    if (ofertas) {
      const evento = status === 400 ? "HTTP_400" : status === 401 ? "HTTP_401"
        : status === 403 ? "HTTP_403" : status === 409 ? "HTTP_409" : "HTTP_500";
      diagnosticarOfertas(evento);
    }
    return NextResponse.json({ mensagem }, { status, headers });
  }
}
