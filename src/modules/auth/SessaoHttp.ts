import { NextResponse } from "next/server";
import { refreshSchema, RefreshInvalidoError } from "./SessaoDTO";
import { sessaoUseCase } from "./SessaoDependencias";

export const headersSessao = { "Cache-Control": "no-store", Pragma: "no-cache" };
export async function responderSessao(request: Request, acao: "renovar" | "logout") {
  try {
    const entrada = refreshSchema.safeParse(await request.json());
    if (!entrada.success) return NextResponse.json({ erro: "Informe somente um refreshToken válido." }, { status: 400, headers: headersSessao });
    if (acao === "logout") {
      await sessaoUseCase.logout(entrada.data.refreshToken);
      return new NextResponse(null, { status: 204, headers: headersSessao });
    }
    return NextResponse.json(await sessaoUseCase.renovar(entrada.data.refreshToken), { headers: headersSessao });
  } catch (erro) {
    if (erro instanceof SyntaxError) return NextResponse.json({ erro: "JSON inválido." }, { status: 400, headers: headersSessao });
    if (erro instanceof RefreshInvalidoError) return NextResponse.json({ erro: erro.message }, { status: 401, headers: headersSessao });
    // Não registrar exceções que possam incluir parâmetros/credenciais.
    return NextResponse.json({ erro: "Não foi possível processar a sessão." }, { status: 500, headers: headersSessao });
  }
}
