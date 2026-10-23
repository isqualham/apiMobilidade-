import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PrismaPoliticaPrivacidadeRepository } from "@/modules/politica-privacidade/PrismaPoliticaPrivacidadeRepository";
import { CadastrarPoliticaPrivacidadeUseCase } from "@/modules/politica-privacidade/CadastrarPoliticaPrivacidadeUseCase";
import { cadastrarPoliticaPrivacidadeSchema } from "@/modules/politica-privacidade/CadastrarPoliticaPrivacidadeDTO";

const politicaPrivacidadeRepository = new PrismaPoliticaPrivacidadeRepository();

const cadastrarPoliticaPrivacidadeUseCase =
  new CadastrarPoliticaPrivacidadeUseCase(politicaPrivacidadeRepository);

export async function GET() {
  try {
    const politicaPrivacidade =
      await politicaPrivacidadeRepository.buscarVigente();

    if (!politicaPrivacidade) {
      return NextResponse.json(
        { erro: "Nenhuma política de privacidade ativa encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json(politicaPrivacidade, { status: 200 });
  } catch (erro: unknown) {
    console.error("Erro ao consultar política de privacidade:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar a política de privacidade." },
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

    const validacao = cadastrarPoliticaPrivacidadeSchema.safeParse(corpo);

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
      const politicaAtiva = await politicaPrivacidadeRepository.buscarVigente();

      if (politicaAtiva) {
        return NextResponse.json(
          { erro: "Já existe uma política de privacidade ativa." },
          { status: 409 },
        );
      }
    }

    const politicaPrivacidade =
      await cadastrarPoliticaPrivacidadeUseCase.executar(validacao.data);

    return NextResponse.json(politicaPrivacidade, { status: 201 });
  } catch (erro: unknown) {
    console.error("Erro ao cadastrar política de privacidade:", erro);

    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2002"
    ) {
      return NextResponse.json(
        {
          erro: "Já existe uma política de privacidade com esses dados únicos.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { erro: "Não foi possível cadastrar a política de privacidade." },
      { status: 500 },
    );
  }
}
