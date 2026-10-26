import type { AtualizarAprovacaoPrestadorDTO, AprovacaoPrestadorResponseDTO } from "./AtualizarAprovacaoPrestadorDTO";

export interface PrestadorRepository {
  decidirAprovacao(dados: AtualizarAprovacaoPrestadorDTO): Promise<AprovacaoPrestadorResponseDTO>;
}
