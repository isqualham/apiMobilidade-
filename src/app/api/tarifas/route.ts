import { NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/auth/AutenticarRequisicao";
import { PrismaTarifaCategoriaRepository } from "@/modules/tarifa/PrismaTarifaCategoriaRepository";
import { CadastrarTarifaCategoriaUseCase } from "@/modules/tarifa/CadastrarTarifaCategoriaUseCase";
import { ConsultarTarifasUseCase } from "@/modules/tarifa/ConsultarTarifasUseCase";
import type { CadastrarTarifaCategoriaDTO } from "@/modules/tarifa/CadastrarTarifaCategoriaDTO";

const repository = new PrismaTarifaCategoriaRepository();

export async function GET() {
  try {
    const useCase = new ConsultarTarifasUseCase(repository);
    const tarifas = await useCase.executar();

    return NextResponse.json({ tarifas });
  } catch (erro) {
    console.error("Erro ao consultar tarifas:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar as tarifas." },
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

    let data: CadastrarTarifaCategoriaDTO;

    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const useCase = new CadastrarTarifaCategoriaUseCase(repository);
    const tarifa = await useCase.executar(data);

    return NextResponse.json(
      {
        mensagem: "Tarifa cadastrada com sucesso.",
        tarifa,
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
        { erro: "Já existe uma tarifa para essa categoria." },
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
        { erro: "A categoria informada não existe." },
        { status: 400 },
      );
    }

    if (
      erro instanceof Error &&
      (erro.message.includes("inválido") ||
        erro.message.includes("válido") ||
        erro.message.includes("não existe") ||
        erro.message.includes("deve ser"))
    ) {
      return NextResponse.json({ erro: erro.message }, { status: 400 });
    }

    console.error("Erro ao cadastrar tarifa:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar a tarifa." },
      { status: 500 },
    );
  }
}
