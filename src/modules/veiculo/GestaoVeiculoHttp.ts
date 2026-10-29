import { NextResponse } from "next/server";
import { TokenInvalidoError, AcessoNegadoError } from "@/modules/auth/AutenticarRequisicao";
import { ErroVeiculo } from "./CadastrarVeiculoDTO";
export const headersGestaoVeiculo = { "Cache-Control": "no-store" };
export function erroGestaoVeiculo(erro: unknown) {
  const status = erro instanceof TokenInvalidoError ? 401 : erro instanceof AcessoNegadoError ? 403 : erro instanceof ErroVeiculo ? erro.statusCode : erro instanceof SyntaxError ? 400 : 500;
  const mensagem = status === 500 ? "Não foi possível processar o veículo." : erro instanceof SyntaxError ? "JSON inválido." : (erro as Error).message;
  return NextResponse.json({ mensagem }, { status, headers: headersGestaoVeiculo });
}
