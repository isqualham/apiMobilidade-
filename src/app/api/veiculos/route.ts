import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";

import { PrismaVeiculoRepository } from "@/modules/veiculo/PrismaVeiculoRepository";

import { CadastrarVeiculoUseCase } from "@/modules/veiculo/CadastrarVeiculoUseCase";

import { ListarVeiculosUseCase } from "@/modules/veiculo/ListarVeiculosUseCase";

import {
  ErroVeiculo,
  type CadastrarVeiculoDTO,
} from "@/modules/veiculo/CadastrarVeiculoDTO";

const repository = new PrismaVeiculoRepository();

const cadastrarVeiculoUseCase = new CadastrarVeiculoUseCase(repository);

const listarVeiculosUseCase = new ListarVeiculosUseCase(repository);

async function obterPrestador(request: NextRequest) {
  const usuario = await autenticarRequisicao(request);

  const prestador = await prisma.prestador.findUnique({
    where: {
      usuarioId: usuario.id,
    },
    select: {
      id: true,
      statusAprovacao: true,
    },
  });

  if (!prestador) {
    throw new ErroVeiculo(
      "O usuário autenticado não possui cadastro de prestador.",
      403,
    );
  }

  if (prestador.statusAprovacao !== "APROVADO") {
    throw new ErroVeiculo(
      "O cadastro do prestador precisa estar aprovado.",
      403,
    );
  }

  return prestador;
}

function tratarErro(error: unknown) {
  if (error instanceof TokenInvalidoError) {
    return NextResponse.json({ mensagem: error.message }, { status: 401 });
  }

  if (error instanceof ErroVeiculo) {
    return NextResponse.json(
      { mensagem: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          mensagem: "Já existe um veículo cadastrado com essa placa.",
        },
        { status: 409 },
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          mensagem: "Prestador ou categoria de veículo inválidos.",
        },
        { status: 400 },
      );
    }
  }

  console.error("Erro na API de veículos:", error);

  return NextResponse.json(
    { mensagem: "Erro interno do servidor." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const prestador = await obterPrestador(request);

    const veiculos = await listarVeiculosUseCase.executar(prestador.id);

    return NextResponse.json({ veiculos }, { status: 200 });
  } catch (error) {
    return tratarErro(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const prestador = await obterPrestador(request);

    const dados: CadastrarVeiculoDTO = await request.json();

    const veiculo = await cadastrarVeiculoUseCase.executar(prestador.id, dados);

    return NextResponse.json(
      {
        mensagem: "Veículo cadastrado com sucesso.",
        veiculo,
      },
      { status: 201 },
    );
  } catch (error) {
    return tratarErro(error);
  }
}
