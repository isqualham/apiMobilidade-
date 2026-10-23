import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PrismaTermoUsoRepository } from "@/modules/termos-uso/PrismaTermoUsoRepository";
import { CadastrarTermoUsoUseCase } from "@/modules/termos-uso/CadastrarTermoUsoUseCase";
import { cadastrarTermoUsoSchema } from "@/modules/termos-uso/CadastrarTermoUsoDTO";

const termoUsoRepository = new PrismaTermoUsoRepository();

const cadastrarTermoUsoUseCase = new CadastrarTermoUsoUseCase(
  termoUsoRepository,
);

export async function GET() {
  try {
    const termoUso = await termoUsoRepository.buscarVigente();

    if (!termoUso) {
      return NextResponse.json(
        { erro: "Nenhum termo de uso ativo encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(termoUso, { status: 200 });
  } catch (erro: unknown) {
    console.error("Erro ao consultar termo de uso:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar o termo de uso." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let corpo: unknown;

    try {
      corpo = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "O corpo da requisição deve conter um JSON válido." },
        { status: 400 },
      );
    }

    const validacao = cadastrarTermoUsoSchema.safeParse(corpo);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: validacao.error.issues,
        },
        { status: 400 },
      );
    }

    if (validacao.data.ativo !== false) {
      const termoAtivo = await termoUsoRepository.buscarVigente();

      if (termoAtivo) {
        return NextResponse.json(
          { erro: "Já existe um termo de uso ativo." },
          { status: 409 },
        );
      }
    }

    const termoUso = await cadastrarTermoUsoUseCase.executar(validacao.data);

    return NextResponse.json(termoUso, { status: 201 });
  } catch (erro: unknown) {
    console.error("Erro ao cadastrar termo de uso:", erro);

    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2002"
    ) {
      return NextResponse.json(
        { erro: "Já existe um termo de uso com esses dados únicos." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o termo de uso." },
      { status: 500 },
    );
  }
}
