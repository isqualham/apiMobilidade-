import type { AuditoriaVeiculo } from "@/generated/prisma/client";
import type { VeiculoResponseDTO } from "./CadastrarVeiculoDTO";
import type { DecisaoVeiculoDTO, EditarVeiculoDTO, ListaVeiculoDTO, PaginaVeiculoDTO } from "./GerenciarVeiculoDTO";
export interface PaginaVeiculo<T> { itens: T[]; proximoCursor: string | null }
export interface GestaoVeiculoRepository {
  listar(administradorId: string, consulta: ListaVeiculoDTO): Promise<PaginaVeiculo<VeiculoResponseDTO>>;
  historico(administradorId: string, veiculoId: string, consulta: PaginaVeiculoDTO): Promise<PaginaVeiculo<AuditoriaVeiculo>>;
  decidir(administradorId: string, veiculoId: string, dados: DecisaoVeiculoDTO): Promise<VeiculoResponseDTO>;
  editar(usuarioId: string, veiculoId: string, dados: EditarVeiculoDTO): Promise<VeiculoResponseDTO>;
}
