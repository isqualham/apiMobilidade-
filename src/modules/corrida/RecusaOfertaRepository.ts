import type { RecusarOfertaDTO, RecusaOfertaResponseDTO } from "./RecusarOfertaDTO";
export interface RecusaOfertaRepository {
  recusar(dados: RecusarOfertaDTO): Promise<RecusaOfertaResponseDTO>;
}
