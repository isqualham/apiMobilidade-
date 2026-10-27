import { disponibilidadeSchema } from "./DisponibilidadePrestadorDTO";
import type { DisponibilidadePrestadorRepository } from "./DisponibilidadePrestadorRepository";
import { PrestadorError } from "./AtualizarAprovacaoPrestadorDTO";
export class DisponibilidadePrestadorUseCase {
  constructor(private readonly repository: DisponibilidadePrestadorRepository) {}
  consultar(usuarioId: string) { return this.repository.consultar(usuarioId); }
  alterar(usuarioId: string, corpo: unknown) {
    const validacao = disponibilidadeSchema.safeParse(corpo);
    if (!validacao.success) throw new PrestadorError("Informe status, versao e, somente para ONLINE, veiculoId.");
    return this.repository.alterar(usuarioId, validacao.data);
  }
}
