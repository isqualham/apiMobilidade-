import { z } from "zod";
import { CorridaError, validarUUID } from "./CorridaDTO";
import type { RecusarOfertaDTO } from "./RecusarOfertaDTO";
import type { RecusaOfertaRepository } from "./RecusaOfertaRepository";
export class RecusarOfertaUseCase {
  constructor(private readonly repository: RecusaOfertaRepository) {}
  executar(dados: RecusarOfertaDTO, corpo: unknown = {}) {
    validarUUID(dados.usuarioId, "Usuário"); validarUUID(dados.corridaId, "Corrida");
    if (!z.strictObject({}).safeParse(corpo).success) throw new CorridaError("A recusa não aceita campos no corpo.");
    return this.repository.recusar(dados);
  }
}
