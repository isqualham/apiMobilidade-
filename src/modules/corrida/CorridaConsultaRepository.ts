import type { DetalheCorridaDTO, HistoricoConsulta, OfertaCorridaDTO, OfertasConsulta, PaginaCorridasDTO, PapelCorrida, ResumoCorridaDTO } from "./ConsultaCorridaDTO";

export interface CorridaConsultaRepository {
  disponiveis(usuarioId: string, consulta: OfertasConsulta): Promise<PaginaCorridasDTO<OfertaCorridaDTO>>;
  ativa(usuarioId: string, papel: PapelCorrida): Promise<DetalheCorridaDTO | null>;
  detalhe(usuarioId: string, corridaId: string): Promise<DetalheCorridaDTO | null>;
  historico(usuarioId: string, consulta: HistoricoConsulta): Promise<PaginaCorridasDTO<ResumoCorridaDTO>>;
}
