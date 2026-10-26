import { z } from "zod";
import { StatusCorrida } from "@/generated/prisma/enums";
import { CorridaError } from "./CorridaDTO";

export const STATUS_ATIVOS = [StatusCorrida.SOLICITADA, StatusCorrida.ACEITA, StatusCorrida.PRESTADOR_A_CAMINHO, StatusCorrida.EM_ANDAMENTO];
export const STATUS_HISTORICO = [StatusCorrida.FINALIZADA, StatusCorrida.CANCELADA, StatusCorrida.ENCERRADA_ANTECIPADAMENTE] as const;
export type PapelCorrida = "todos" | "passageiro" | "prestador";
export interface CursorCorrida { createdAt: string; id: string }
export interface PaginaConsulta { limite: number; cursor?: CursorCorrida }
export interface HistoricoConsulta extends PaginaConsulta { papel: PapelCorrida; status?: typeof STATUS_HISTORICO[number] }
export interface OfertasConsulta extends PaginaConsulta { veiculoId: string }
export interface ResumoCorridaDTO {
  id: string; status: StatusCorrida; categoriaVeiculoId: string;
  distanciaKm: number; valorTotal: number; valorFinalCobrado: number | null; createdAt: string;
}
export interface PontoCorridaDTO { latitude: number; longitude: number }
export interface OfertaCorridaDTO extends Omit<ResumoCorridaDTO, "valorFinalCobrado"> {
  origemAproximada: PontoCorridaDTO; destinoAproximado: PontoCorridaDTO;
}
export interface DetalheCorridaDTO extends ResumoCorridaDTO {
  papel: Exclude<PapelCorrida, "todos">;
  origem: PontoCorridaDTO & { endereco: string };
  destino: PontoCorridaDTO & { endereco: string };
  valorKmAplicado: number; distanciaPercorridaKm: number | null;
  dataAceite: string | null; dataInicio: string | null;
  dataFinalizacao: string | null; dataCancelamento: string | null;
  veiculo: { placa: string; marca: string; modelo: string; cor: string | null } | null;
}
export interface PaginaCorridasDTO<T> { corridas: T[]; proximoCursor: string | null }

const cursorSchema = z.strictObject({ createdAt: z.iso.datetime(), id: z.uuid() });
export function codificarCursor(cursor: CursorCorrida): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
function decodificarCursor(valor: string): CursorCorrida {
  try {
    if (valor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(valor)) throw new Error();
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(valor, "base64url").toString("utf8")));
    if (!Number.isFinite(new Date(cursor.createdAt).getTime())) throw new Error();
    return cursor;
  } catch { throw new CorridaError("Cursor inválido."); }
}
const pagina = {
  limite: z.string().regex(/^[1-9]\d?$/).transform(Number).pipe(z.number().max(50)).default(20),
  cursor: z.string().transform(decodificarCursor).optional(),
};
const papel = z.enum(["todos", "passageiro", "prestador"]).default("todos");
export const ofertasSchema = z.strictObject({ ...pagina, veiculoId: z.uuid() });
export const historicoSchema = z.strictObject({ ...pagina, papel, status: z.enum(STATUS_HISTORICO).optional() });
export const ativaSchema = z.strictObject({ papel });
export function validarConsulta<T>(schema: z.ZodType<T>, params: URLSearchParams): T {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of params) {
    if (Object.hasOwn(valores, chave)) throw new CorridaError("Parâmetro repetido.");
    Object.defineProperty(valores, chave, { value: valor, enumerable: true });
  }
  const resultado = schema.safeParse(valores);
  if (!resultado.success) throw new CorridaError("Parâmetros de consulta inválidos.");
  return resultado.data;
}
