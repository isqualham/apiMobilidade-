import { NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/auth/AutenticarRequisicao";
import { PrismaCategoriaVeiculoRepository } from "@/modules/categoria-veiculo/PrismaCategoriaVeiculoRepository";
import { CadastrarCategoriaVeiculoUseCase } from "@/modules/categoria-veiculo/CadastrarCategoriaVeiculoUseCase";
import { ListarCategoriasVeiculoUseCase } from "@/modules/categoria-veiculo/ListarCategoriasVeiculoUseCase";
import type { CadastrarCategoriaVeiculoDTO } from "@/modules/categoria-veiculo/CadastrarCategoriaVeiculoDTO";

const repository = new PrismaCategoriaVeiculoRepository();

export async function GET() {
  try {
    const useCase = new ListarCategoriasVeiculoUseCase(repository);
    const categorias = await useCase.executar();

    return NextResponse.json({ categorias });
  } catch (erro) {
    console.error("Erro ao listar categorias:", erro);

    return NextResponse.json(
      { erro: "Não foi possível listar as categorias." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);

    if (!usuario.administrador) {
      return NextResponse.json(
        { erro: "Acesso permitido somente a administradores." },
        { status: 403 },
      );
    }

    let data: CadastrarCategoriaVeiculoDTO;

    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const useCase = new CadastrarCategoriaVeiculoUseCase(repository);
    const categoria = await useCase.executar(data);

    return NextResponse.json(
      {
        mensagem: "Categoria cadastrada com sucesso.",
        categoria,
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
        { erro: "Já existe uma categoria com esse nome." },
        { status: 409 },
      );
    }

    if (erro instanceof Error && erro.message.startsWith("Já existe")) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }

    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2003"
    ) {
      return NextResponse.json(
        { erro: "O tipo de veículo informado não existe." },
        { status: 400 },
      );
    }

    if (
      erro instanceof Error &&
      (erro.message.includes("inválido") ||
        erro.message.includes("obrigatório") ||
        erro.message.includes("máximo") ||
        erro.message.includes("deve ser") ||
        erro.message.includes("deve ser um inteiro") ||
        erro.message.includes("não está ativo"))
    ) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }

    console.error("Erro ao cadastrar categoria:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar a categoria." },
      { status: 500 },
    );
  }
}
