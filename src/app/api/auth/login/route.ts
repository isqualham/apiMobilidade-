import { NextResponse } from "next/server";
import { loginUsuarioSchema } from "@/modules/usuario/application/dtos/LoginUsuarioSchema";
import {
  CredenciaisInvalidasError,
  UsuarioInativoError,
} from "@/modules/usuario/application/use-cases/AutenticarUsuario";
import { autenticarUsuario } from "@/modules/usuario/infrastructure/registrarDependenciasAutenticacao";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Autenticar usuário
 *     description: Valida as credenciais e retorna um token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@example.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: SenhaTeste123
 *     responses:
 *       "200":
 *         description: Login realizado com sucesso.
 *       "400":
 *         description: Dados inválidos.
 *       "401":
 *         description: Credenciais inválidas.
 *       "403":
 *         description: Usuário inativo.
 *       "500":
 *         description: Erro interno do servidor.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validacao = loginUsuarioSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: validacao.error.flatten(),
        },
        { status: 400 },
      );
    }

    const resultado = await autenticarUsuario.executar(validacao.data);

    return NextResponse.json(resultado, { status: 200 });
  } catch (erro: unknown) {
    if (erro instanceof CredenciaisInvalidasError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    if (erro instanceof UsuarioInativoError) {
      return NextResponse.json({ erro: erro.message }, { status: 403 });
    }

    console.error("Erro ao autenticar usuário:", erro);

    return NextResponse.json(
      { erro: "Não foi possível realizar o login." },
      { status: 500 },
    );
  }
}
