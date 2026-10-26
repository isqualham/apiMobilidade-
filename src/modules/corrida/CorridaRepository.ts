import type {
  SolicitarCorridaDTO,
  CorridaResponseDTO,
  CancelarCorridaDTO,
  EncerrarCorridaAntecipadamenteDTO,
} from "./CorridaDTO";

export interface CriarCorridaRepositoryDTO extends SolicitarCorridaDTO {
  distanciaKm: string;
  valorKmAplicado: string;
  valorTotal: string;
}

export interface AceiteCorridaRepositoryDTO {
  corridaId: string;
  usuarioId: string;
  veiculoId: string;
}

export interface CorridaRepository {
  criar(dados: CriarCorridaRepositoryDTO): Promise<CorridaResponseDTO>;

  aceitar(dados: AceiteCorridaRepositoryDTO): Promise<CorridaResponseDTO>;

  iniciar(corridaId: string, usuarioId: string): Promise<CorridaResponseDTO>;

  finalizar(corridaId: string, usuarioId: string): Promise<CorridaResponseDTO>;

  cancelar(dados: CancelarCorridaDTO): Promise<CorridaResponseDTO>;

  encerrarAntecipadamente(
    dados: EncerrarCorridaAntecipadamenteDTO,
  ): Promise<CorridaResponseDTO>;
}
