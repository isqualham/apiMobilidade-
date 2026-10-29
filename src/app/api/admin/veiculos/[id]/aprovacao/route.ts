import { NextResponse } from "next/server";
import { exigirAdministrador } from "@/modules/auth/AutenticarRequisicao";
import { GerenciarVeiculoUseCase } from "@/modules/veiculo/GerenciarVeiculoUseCase";
import { PrismaGestaoVeiculoRepository } from "@/modules/veiculo/PrismaGestaoVeiculoRepository";
import { erroGestaoVeiculo, headersGestaoVeiculo } from "@/modules/veiculo/GestaoVeiculoHttp";
const useCase = new GerenciarVeiculoUseCase(new PrismaGestaoVeiculoRepository());
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await exigirAdministrador(request);
    const { id } = await context.params;
    return NextResponse.json(await useCase.decidir(usuario.id, id, await request.json()), { headers: headersGestaoVeiculo });
  } catch (erro) { return erroGestaoVeiculo(erro); }
}
