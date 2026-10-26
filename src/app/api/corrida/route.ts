import { consultarCorridas, responderConsultaCorrida } from "@/modules/corrida/ConsultaCorridaHttp";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import {
  autenticarRequisicao,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";

import { CorridaError } from "@/modules/corrida/CorridaDTO";
import type { SolicitarCorridaDTO } from "@/modules/corrida/CorridaDTO";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { SolicitarCorridaUseCase } from "@/modules/corrida/SolicitarCorridaUseCase";
import { PrismaTarifaCategoriaRepository } from "@/modules/tarifa/PrismaTarifaCategoriaRepository";
import { criarRotasService } from "@/modules/corrida/OsrmRotasService";

export async function POST(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);

    const corpo: unknown = await request.json();

    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
      return NextResponse.json(
        { mensagem: "Dados da corrida inválidos." },
        { status: 400 },
      );
    }

    const dados = {
      ...corpo,
      passageiroId: usuario.id,
    } as SolicitarCorridaDTO;

    const useCase = new SolicitarCorridaUseCase(
      new PrismaCorridaRepository(),
      new PrismaTarifaCategoriaRepository(),
      criarRotasService(),
    );
    const corrida = await useCase.executar(dados);

    return NextResponse.json(
      {
        mensagem: "Corrida solicitada com sucesso.",
        corrida,
      },
      { status: 201 },
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

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2003") {
      return NextResponse.json(
        { mensagem: "Passageiro ou categoria inválidos." },
        { status: 400 },
      );
    }
  }

  console.error("Erro ao solicitar corrida:", erro);

  return NextResponse.json(
    { mensagem: "Erro interno do servidor." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  return responderConsultaCorrida(request, (usuarioId, params) => consultarCorridas.historico(usuarioId, params));
}
