export type StatusCorridaDTO =
  | "SOLICITADA"
  | "ACEITA"
  | "PRESTADOR_A_CAMINHO"
  | "EM_ANDAMENTO"
  | "FINALIZADA"
  | "CANCELADA"
  | "ENCERRADA_ANTECIPADAMENTE";

export type TipoResponsavelCorrida =
  | "PASSAGEIRO"
  | "PRESTADOR"
  | "ADMINISTRADOR";

export interface SolicitarCorridaDTO {
  passageiroId: string;
  categoriaVeiculoId: string;
  origemEndereco: string;
  origemLatitude: number;
  origemLongitude: number;
  destinoEndereco: string;
  destinoLatitude: number;
  destinoLongitude: number;
}

export interface AceitarCorridaDTO {
  corridaId: string;
  usuarioId: string;
  veiculoId: string;
}

export interface IniciarCorridaDTO {
  corridaId: string;
  usuarioId: string;
}

export interface FinalizarCorridaDTO {
  corridaId: string;
  usuarioId: string;
}

export interface CancelarCorridaDTO {
  corridaId: string;
  usuarioId: string;
  motivo: string;
  descricao?: string;
}

export type EncerrarCorridaAntecipadamenteDTO = CancelarCorridaDTO;

export interface CorridaResponseDTO {
  id: string;
  passageiroId: string;
  prestadorId: string | null;
  veiculoId: string | null;
  categoriaVeiculoId: string;
  status: StatusCorridaDTO;
  distanciaKm: number;
  valorKmAplicado: number;
  valorTotal: number;
  distanciaPercorridaKm: number | null;
  valorFinalCobrado: number | null;
  dataAceite: Date | null;
  dataInicio: Date | null;
  dataFinalizacao: Date | null;
  dataCancelamento: Date | null;
}

export class CorridaError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "CorridaError";
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarUUID(valor: string, nome: string): void {
  if (typeof valor !== "string" || !UUID_REGEX.test(valor)) {
    throw new CorridaError(`${nome} inválido.`);
  }
}

export function validarTexto(
  valor: string,
  nome: string,
  limite: number,
): void {
  if (typeof valor !== "string" || !valor.trim() || valor.length > limite) {
    throw new CorridaError(`${nome} inválido.`);
  }
}

export function validarCoordenada(
  valor: number,
  nome: string,
  limite: number,
): void {
  if (
    typeof valor !== "number" ||
    !Number.isFinite(valor) ||
    Math.abs(valor) > limite
  ) {
    throw new CorridaError(`${nome} inválida.`);
  }
}

export function validarMotivo(dados: CancelarCorridaDTO): void {
  validarUUID(dados.corridaId, "ID da corrida");
  validarUUID(dados.usuarioId, "ID do usuário");
  validarTexto(dados.motivo, "Motivo", 150);

  if (dados.descricao !== undefined) {
    if (typeof dados.descricao !== "string" || dados.descricao.length > 500) {
      throw new CorridaError("Descrição inválida.");
    }
  }
}
