import type {
  CadastrarVeiculoDTO,
  VeiculoResponseDTO,
} from "./CadastrarVeiculoDTO";

export interface VeiculoRepository {
  cadastrar(
    prestadorId: string,
    dados: CadastrarVeiculoDTO,
  ): Promise<VeiculoResponseDTO>;

  listarPorPrestador(prestadorId: string): Promise<VeiculoResponseDTO[]>;

  buscarPorPlaca(placa: string): Promise<VeiculoResponseDTO | null>;

  verificarCategoriaAtiva(categoriaVeiculoId: string): Promise<boolean>;
}
