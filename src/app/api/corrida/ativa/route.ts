import { consultarCorridas, responderConsultaCorrida } from "@/modules/corrida/ConsultaCorridaHttp";

export async function GET(request: Request) {
  return responderConsultaCorrida(request, async (usuarioId, params) => ({ corrida: await consultarCorridas.ativa(usuarioId, params) }));
}
