import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { cadastrarUsuarioSchema } from "@/modules/usuario/application/dtos/CadastrarUsuarioSchema";
import { cadastrarUsuario } from "@/modules/usuario/infrastructure/registrarDependenciasUsuario";
import { EmailJaCadastradoError } from "@/modules/usuario/application/use-cases/CadastrarUsuario";

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     tags:
 *       - Usuários
 *     summary: Cadastrar usuário
 *     description: Cria um novo usuário na plataforma ViaU.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - senha
 *             properties:
 *               nome:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: William Freitas
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: william.teste@example.com
 *               telefone:
 *                 type: string
 *                 maxLength: 20
 *                 example: "65999999999"
 *               senha:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 72
 *                 example: SenhaTeste123
 *     responses:
 *       "201":
 *         description: Usuário cadastrado com sucesso.
 *       "400":
 *         description: Dados inválidos.
 *       "409":
 *         description: E-mail já cadastrado.
 *       "500":
 *         description: Erro interno do servidor.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validacao = cadastrarUsuarioSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: validacao.error.flatten(),
        },
        { status: 400 },
      );
    }

    const usuario = await cadastrarUsuario.executar(validacao.data);

    return NextResponse.json(usuario, { status: 201 });
  } catch (erro: unknown) {
    if (erro instanceof EmailJaCadastradoError) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }

    if (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === "P2002"
    ) {
      return NextResponse.json(
        { erro: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    console.error("Erro ao cadastrar usuário:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o usuário." },
      { status: 500 },
    );
  }
}
