import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
import { DisponibilidadePrestadorUseCase } from "@/modules/prestador/DisponibilidadePrestadorUseCase";
import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { PrestadorError } from "@/modules/prestador/AtualizarAprovacaoPrestadorDTO";
const useCase = new DisponibilidadePrestadorUseCase(new PrismaDisponibilidadePrestadorRepository());
const headers = { "Cache-Control": "no-store" };
function falha(erro: unknown) {
  const status = erro instanceof TokenInvalidoError ? 401 : erro instanceof PrestadorError ? erro.statusCode : erro instanceof SyntaxError ? 400 : 500;
  const mensagem = status === 500 ? "Não foi possível consultar ou alterar disponibilidade." : erro instanceof SyntaxError ? "JSON inválido." : (erro as Error).message;
  return NextResponse.json({ erro: mensagem }, { status, headers });
}
export async function GET(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);
    return NextResponse.json(await useCase.consultar(usuario.id), { headers });
  } catch (erro) { return falha(erro); }
}
export async function PATCH(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);
    return NextResponse.json(await useCase.alterar(usuario.id, await request.json()), { headers });
  } catch (erro) { return falha(erro); }
}
