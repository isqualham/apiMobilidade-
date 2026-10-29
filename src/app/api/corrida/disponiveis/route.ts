import { consultarCorridas, responderConsultaCorrida } from "@/modules/corrida/ConsultaCorridaHttp";

export async function GET(request: Request) {
  return responderConsultaCorrida(request, (usuarioId, params) => consultarCorridas.disponiveis(usuarioId, params), true);
}
