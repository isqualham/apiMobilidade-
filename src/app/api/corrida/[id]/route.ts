import { consultarCorridas, responderConsultaCorrida } from "@/modules/corrida/ConsultaCorridaHttp";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return responderConsultaCorrida(request, async (usuarioId, params) => {
    const { id } = await context.params;
    return { corrida: await consultarCorridas.detalhe(usuarioId, id, params) };
  });
}
