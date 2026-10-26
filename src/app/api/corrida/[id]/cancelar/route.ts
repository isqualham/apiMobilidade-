import { NextRequest, NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";

import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { CancelarCorridaUseCase } from "@/modules/corrida/CancelarCorridaUseCase";

const useCase = new CancelarCorridaUseCase(new PrismaCorridaRepository());

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const usuario = await autenticarRequisicao(request);
    const { id } = await context.params;

    const corpo: unknown = await request.json();

    if (
      !corpo ||
      typeof corpo !== "object" ||
      Array.isArray(corpo) ||
      !("motivo" in corpo) ||
      typeof corpo.motivo !== "string"
    ) {
      return NextResponse.json(
        { mensagem: "Informe o motivo do cancelamento." },
        { status: 400 },
      );
    }

    const descricao = "descricao" in corpo ? corpo.descricao : undefined;

    const corrida = await useCase.executar({
      corridaId: id,
      usuarioId: usuario.id,
      motivo: corpo.motivo,
      descricao: descricao as string | undefined,
    });

    return NextResponse.json(
      { mensagem: "Corrida cancelada sem cobrança.", corrida },
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

    if (erro instanceof SyntaxError) {
      return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 });
    }

    console.error("Erro ao cancelar corrida:", erro);

    return NextResponse.json(
      { mensagem: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
