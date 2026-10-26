import { headersSessao } from "@/modules/auth/SessaoHttp";
import { NextResponse } from "next/server";
import { loginUsuarioSchema } from "@/modules/usuario/LoginUsuarioDTO";
import {
  CredenciaisInvalidasError,
  UsuarioInativoError,
} from "@/modules/auth/AutenticarUsuarioUseCase";
import { autenticarUsuario } from "@/modules/auth/AutenticarUsuarioDependencias";

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

    return NextResponse.json(resultado, { status: 200, headers: headersSessao });
  } catch (erro: unknown) {
    if (erro instanceof CredenciaisInvalidasError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    if (erro instanceof UsuarioInativoError) {
      return NextResponse.json({ erro: erro.message }, { status: 403 });
    }

    // Não registrar exceções que possam conter credenciais.

    return NextResponse.json(
      { erro: "Não foi possível realizar o login." },
      { status: 500 },
    );
  }
}
