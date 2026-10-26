import { CorridaError } from "./CorridaDTO";

export interface CoordenadasRota {
  latitude: number;
  longitude: number;
}

export interface RotasService {
  // O adaptador deve consultar um provedor real no servidor. Nunca usar distância
  // enviada pelo cliente, distância em linha reta ou fallback estimado.
  calcularRota(entrada: {
    origem: CoordenadasRota;
    destino: CoordenadasRota;
    categoriaVeiculoId: string;
  }): Promise<{ distanciaMetros: number }>;
}

export class RotasServiceNaoConfigurado implements RotasService {
  async calcularRota(): Promise<{ distanciaMetros: number }> {
    throw new CorridaError(
      "Serviço de rotas não configurado. Não é possível calcular uma distância confiável.",
      503,
    );
  }
}
