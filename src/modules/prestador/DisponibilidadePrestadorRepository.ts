import type { AlterarDisponibilidadeDTO, DisponibilidadePrestadorDTO } from "./DisponibilidadePrestadorDTO";
export interface DisponibilidadePrestadorRepository {
  consultar(usuarioId: string): Promise<DisponibilidadePrestadorDTO>;
  alterar(usuarioId: string, dados: AlterarDisponibilidadeDTO): Promise<DisponibilidadePrestadorDTO>;
}
