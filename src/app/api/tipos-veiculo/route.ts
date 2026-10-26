import { NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/auth/AutenticarRequisicao";
import { PrismaTipoVeiculoRepository } from "@/modules/tipo-veiculo/PrismaTipoVeiculoRepository";
import { CadastrarTipoVeiculoUseCase } from "@/modules/tipo-veiculo/CadastrarTipoVeiculoUseCase";
import { ListarTiposVeiculoUseCase } from "@/modules/tipo-veiculo/ListarTiposVeiculoUseCase";
import type { CadastrarTipoVeiculoDTO } from "@/modules/tipo-veiculo/CadastrarTipoVeiculoDTO";

const repository = new PrismaTipoVeiculoRepository();

export async function GET() {
  try {
    const useCase = new ListarTiposVeiculoUseCase(repository);
    const tipos = await useCase.executar();

    return NextResponse.json({ tipos });
  } catch (erro) {
    console.error("Erro ao listar tipos de veículo:", erro);

    return NextResponse.json(
      { erro: "Não foi possível listar os tipos de veículo." },
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

    let data: CadastrarTipoVeiculoDTO;

    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const useCase = new CadastrarTipoVeiculoUseCase(repository);
    const tipo = await useCase.executar(data);

    return NextResponse.json(
      {
        mensagem: "Tipo de veículo cadastrado com sucesso.",
        tipo,
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
        { erro: "Já existe um tipo de veículo com esse nome." },
        { status: 409 },
      );
    }

    if (erro instanceof Error && erro.message.startsWith("Já existe")) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }

    if (
      erro instanceof Error &&
      (erro.message.includes("obrigatório") ||
        erro.message.includes("máximo") ||
        erro.message.includes("deve ser"))
    ) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }

    console.error("Erro ao cadastrar tipo de veículo:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o tipo de veículo." },
      { status: 500 },
    );
  }
}
