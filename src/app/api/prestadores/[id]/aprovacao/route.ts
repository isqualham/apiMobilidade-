import { NextResponse } from "next/server";
import { exigirAdministrador, TokenInvalidoError, AcessoNegadoError } from "@/modules/auth/AutenticarRequisicao";
import { AtualizarAprovacaoPrestadorUseCase } from "@/modules/prestador/AtualizarAprovacaoPrestadorUseCase";
import { PrismaPrestadorRepository } from "@/modules/prestador/PrismaPrestadorRepository";
import { PrestadorError } from "@/modules/prestador/AtualizarAprovacaoPrestadorDTO";

const useCase = new AtualizarAprovacaoPrestadorUseCase(new PrismaPrestadorRepository());

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const administrador = await exigirAdministrador(request);
    const { id } = await context.params;
    const corpo: unknown = await request.json();
    const prestador = await useCase.executar(id, administrador.id, corpo);
    return NextResponse.json({ mensagem: "Cadastro de prestador avaliado com sucesso.", prestador });
  } catch (erro) {
    if (erro instanceof TokenInvalidoError) return NextResponse.json({ erro: erro.message }, { status: 401 });
    if (erro instanceof AcessoNegadoError) return NextResponse.json({ erro: erro.message }, { status: 403 });
    if (erro instanceof PrestadorError) return NextResponse.json({ erro: erro.message }, { status: erro.statusCode });
    if (erro instanceof SyntaxError) return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    console.error("Erro ao avaliar prestador:", erro);
    return NextResponse.json({ erro: "Não foi possível avaliar o prestador." }, { status: 500 });
  }
}
