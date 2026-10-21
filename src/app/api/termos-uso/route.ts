import { NextResponse } from "next/server";
import { cadastrarTermoUsoSchema } from "@/modules/termos-uso/CadastrarTermoUsoDTO";
import { CadastrarTermoUsoUseCase } from "@/modules/termos-uso/CadastrarTermoUsoUseCase";
import { PrismaTermoUsoRepository } from "@/modules/termos-uso/PrismaTermoUsoRepository";

const termoUsoRepository = new PrismaTermoUsoRepository();

const cadastrarTermoUso = new CadastrarTermoUsoUseCase(termoUsoRepository);

export async function GET() {
  try {
    const termo = await termoUsoRepository.buscarVigente();

    if (!termo) {
      return NextResponse.json(
        { erro: "Nenhum termo de uso ativo encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(termo, { status: 200 });
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
    const body: unknown = await request.json();
    const validacao = cadastrarTermoUsoSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: validacao.error.flatten(),
        },
        { status: 400 },
      );
    }

    const termo = await cadastrarTermoUso.executar(validacao.data);

    return NextResponse.json(termo, { status: 201 });
  } catch (erro: unknown) {
    if (erro instanceof Error && erro.message.startsWith("Já existe")) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }

    console.error("Erro ao cadastrar termo de uso:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o termo de uso." },
      { status: 500 },
    );
  }
}
