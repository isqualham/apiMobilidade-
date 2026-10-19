import { NextResponse } from "next/server";
import {
  autenticarRequisicao,
  TokenInvalidoError,
} from "@/modules/usuario/infrastructure/cryptography/Autenticacao";

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Autenticação
 *     summary: Consultar usuário autenticado
 *     description: Retorna os dados do usuário a partir de um token JWT válido.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Usuário autenticado.
 *       "401":
 *         description: Token ausente, inválido ou expirado.
 *       "500":
 *         description: Erro interno do servidor.
 */
export async function GET(request: Request) {
  try {
    const usuario = await autenticarRequisicao(request);

    return NextResponse.json(usuario, { status: 200 });
  } catch (erro: unknown) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    console.error("Erro ao consultar usuário autenticado:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar o usuário." },
      { status: 500 },
    );
  }
}
