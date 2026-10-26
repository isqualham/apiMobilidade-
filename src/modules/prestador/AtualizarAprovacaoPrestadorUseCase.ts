import { z } from "zod";
import { decisaoPrestadorSchema, PrestadorError, type AprovacaoPrestadorResponseDTO } from "./AtualizarAprovacaoPrestadorDTO";
import type { PrestadorRepository } from "./PrestadorRepository";

export class AtualizarAprovacaoPrestadorUseCase {
  constructor(private readonly repository: PrestadorRepository) {}

  async executar(
    prestadorId: string,
    administradorId: string,
    corpo: unknown,
  ): Promise<AprovacaoPrestadorResponseDTO> {
    if (!z.uuid().safeParse(prestadorId).success || !z.uuid().safeParse(administradorId).success) {
      throw new PrestadorError("ID inválido.");
    }
    const decisao = decisaoPrestadorSchema.safeParse(corpo);
    if (!decisao.success) {
      throw new PrestadorError("Informe somente statusAprovacao: APROVADO ou REJEITADO.");
    }
    return this.repository.decidirAprovacao({
      prestadorId,
      administradorId,
      statusAprovacao: decisao.data.statusAprovacao,
    });
  }
}
