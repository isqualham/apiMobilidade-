import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
import { CotarCorridaUseCase } from "@/modules/corrida/CotarCorridaUseCase";
import { PrismaTarifaCategoriaRepository } from "@/modules/tarifa/PrismaTarifaCategoriaRepository";
import { criarRotasService } from "@/modules/corrida/OsrmRotasService";
import { CorridaError } from "@/modules/corrida/CorridaDTO";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function POST(request: Request) {
  try {
    await autenticarRequisicao(request);
    const corpo: unknown = await request.json();
    const useCase = new CotarCorridaUseCase(new PrismaTarifaCategoriaRepository(), criarRotasService());
    return NextResponse.json(await useCase.executar(corpo), { headers });
  } catch (erro) {
    const status = erro instanceof TokenInvalidoError ? 401 : erro instanceof CorridaError ? erro.statusCode : erro instanceof SyntaxError ? 400 : 500;
    const mensagem = status === 500 ? "Não foi possível calcular a cotação." : erro instanceof SyntaxError ? "JSON inválido." : (erro as Error).message;
    return NextResponse.json({ mensagem }, { status, headers });
  }
}
