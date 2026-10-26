import { responderSessao } from "@/modules/auth/SessaoHttp";
export async function POST(request: Request) { return responderSessao(request, "renovar"); }
