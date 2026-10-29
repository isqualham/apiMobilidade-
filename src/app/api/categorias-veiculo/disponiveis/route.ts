import { NextResponse } from "next/server";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
import { PrismaCategoriasDisponiveisRepository } from "@/modules/categoria-veiculo/PrismaCategoriasDisponiveisRepository";
import { ListarCategoriasDisponiveisUseCase } from "@/modules/categoria-veiculo/ListarCategoriasDisponiveisUseCase";

const useCase = new ListarCategoriasDisponiveisUseCase(new PrismaCategoriasDisponiveisRepository());
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);
    const categorias = await useCase.executar(usuario.id);
    return NextResponse.json({ categorias }, { headers });
  } catch (erro) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 401, headers });
    }
    return NextResponse.json({ erro: "Não foi possível consultar categorias disponíveis." }, { status: 500, headers });
  }
}
