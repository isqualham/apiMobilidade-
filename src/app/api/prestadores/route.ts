import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/auth/AutenticarRequisicao";

export async function POST(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);

    const prestadorExistente = await prisma.prestador.findUnique({
      where: {
        usuarioId: usuario.id,
      },
    });

    if (prestadorExistente) {
      return NextResponse.json(
        { erro: "Você já possui um cadastro de prestador." },
        { status: 409 },
      );
    }

    const prestador = await prisma.prestador.create({
      data: {
        usuarioId: usuario.id,
        statusAprovacao: "PENDENTE",
      },
      select: {
        id: true,
        usuarioId: true,
        statusAprovacao: true,
        dataSolicitacao: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        mensagem: "Solicitação de cadastro de prestador realizada com sucesso.",
        prestador,
      },
      { status: 201 },
    );
  } catch (erro: unknown) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2002"
    ) {
      return NextResponse.json(
        { erro: "Você já possui um cadastro de prestador." },
        { status: 409 },
      );
    }

    console.error("Erro ao cadastrar prestador:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o prestador." },
      { status: 500 },
    );
  }
}
