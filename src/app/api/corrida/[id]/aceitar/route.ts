import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import {
  autenticarRequisicao,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";

import { CorridaError } from "@/modules/corrida/CorridaDTO";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { AceitarCorridaUseCase } from "@/modules/corrida/AceitarCorridaUseCase";

const useCase = new AceitarCorridaUseCase(new PrismaCorridaRepository());

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const usuario = await autenticarRequisicao(request);

    if (!usuario.prestador || usuario.statusAprovacao !== "APROVADO") {
      return NextResponse.json(
        { mensagem: "Somente prestadores aprovados podem aceitar corridas." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const corpo: unknown = await request.json();

    if (
      !corpo ||
      typeof corpo !== "object" ||
      Array.isArray(corpo) ||
      !("veiculoId" in corpo) ||
      typeof corpo.veiculoId !== "string"
    ) {
      return NextResponse.json(
        { mensagem: "Informe um veiculoId válido." },
        { status: 400 },
      );
    }

    const corrida = await useCase.executar({
      corridaId: id,
      usuarioId: usuario.id,
      veiculoId: corpo.veiculoId,
    });

    return NextResponse.json(
      { mensagem: "Corrida aceita com sucesso.", corrida },
      { status: 200 },
    );
  } catch (erro) {
    return tratarErroCorrida(erro);
  }
}

function tratarErroCorrida(erro: unknown) {
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

  if (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === "P2034"
  ) {
    return NextResponse.json(
      { mensagem: "Conflito ao aceitar a corrida. Tente novamente." },
      { status: 409 },
    );
  }

  console.error("Erro ao aceitar corrida:", erro);

  return NextResponse.json(
    { mensagem: "Erro interno do servidor." },
    { status: 500 },
  );
}
