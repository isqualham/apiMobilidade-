import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { RecusarOfertaUseCase } from "@/modules/corrida/RecusarOfertaUseCase";
import { PrismaRecusaOfertaRepository } from "@/modules/corrida/PrismaRecusaOfertaRepository";
const useCase = new RecusarOfertaUseCase(new PrismaRecusaOfertaRepository());
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await autenticarRequisicao(request);
    const { id } = await context.params;
    const texto = await request.text();
    const corpo: unknown = texto.trim() ? JSON.parse(texto) : {};
    return NextResponse.json(await useCase.executar({ usuarioId: usuario.id, corridaId: id }, corpo), { headers });
  } catch (erro) {
    const status = erro instanceof TokenInvalidoError ? 401 : erro instanceof CorridaError ? erro.statusCode : erro instanceof SyntaxError ? 400 : 500;
    const mensagem = status === 500 ? "Não foi possível recusar oferta." : erro instanceof SyntaxError ? "JSON inválido." : (erro as Error).message;
    return NextResponse.json({ mensagem }, { status, headers });
  }
}
