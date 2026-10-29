import { NextResponse } from "next/server";
import { exigirAdministrador } from "@/modules/auth/AutenticarRequisicao";
import { GerenciarVeiculoUseCase } from "@/modules/veiculo/GerenciarVeiculoUseCase";
import { PrismaGestaoVeiculoRepository } from "@/modules/veiculo/PrismaGestaoVeiculoRepository";
import { erroGestaoVeiculo, headersGestaoVeiculo } from "@/modules/veiculo/GestaoVeiculoHttp";
const useCase = new GerenciarVeiculoUseCase(new PrismaGestaoVeiculoRepository());
export async function GET(request: Request) {
  try {
    const usuario = await exigirAdministrador(request);
    return NextResponse.json(await useCase.listar(usuario.id, new URL(request.url).searchParams), { headers: headersGestaoVeiculo });
  } catch (erro) { return erroGestaoVeiculo(erro); }
}
