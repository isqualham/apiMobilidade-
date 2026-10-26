import { NextRequest, NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";

import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { FinalizarCorridaUseCase } from "@/modules/corrida/FinalizarCorridaUseCase";

const useCase = new FinalizarCorridaUseCase(new PrismaCorridaRepository());

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const usuario = await autenticarRequisicao(request);

    if (!usuario.prestador || usuario.statusAprovacao !== "APROVADO") {
      return NextResponse.json(
        { mensagem: "Somente prestadores aprovados podem finalizar corridas." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const corrida = await useCase.executar({
      corridaId: id,
      usuarioId: usuario.id,
    });

    return NextResponse.json(
      { mensagem: "Corrida finalizada com sucesso.", corrida },
      { status: 200 },
    );
  } catch (erro) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ mensagem: erro.message }, { status: 401 });
    }

    if (erro instanceof AcessoNegadoError) {
      return NextResponse.json({ mensagem: erro.message }, { status: 403 });
    }

    if (erro instanceof CorridaError) {
      return NextResponse.json(
        { mensagem: erro.message },
        { status: erro.statusCode },
      );
    }

    console.error("Erro ao finalizar corrida:", erro);

    return NextResponse.json(
      { mensagem: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
