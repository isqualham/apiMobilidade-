import { validarUUID, CorridaError } from "./CorridaDTO";
import { ativaSchema, historicoSchema, ofertasSchema, validarConsulta } from "./ConsultaCorridaDTO";
import type { CorridaConsultaRepository } from "./CorridaConsultaRepository";

export class ConsultarCorridasUseCase {
  constructor(private readonly repository: CorridaConsultaRepository) {}
  disponiveis(usuarioId: string, params: URLSearchParams) {
    validarUUID(usuarioId, "Usuário");
    return this.repository.disponiveis(usuarioId, validarConsulta(ofertasSchema, params));
  }
  ativa(usuarioId: string, params: URLSearchParams) {
    validarUUID(usuarioId, "Usuário");
    return this.repository.ativa(usuarioId, validarConsulta(ativaSchema, params).papel);
  }
  async detalhe(usuarioId: string, corridaId: string, params: URLSearchParams) {
    validarUUID(usuarioId, "Usuário");
    validarUUID(corridaId, "Corrida");
    if (params.size) throw new CorridaError("Esta consulta não aceita parâmetros.");
    const corrida = await this.repository.detalhe(usuarioId, corridaId);
    // Mesma resposta para inexistente e não participante: não revela existência.
    if (!corrida) throw new CorridaError("Corrida não encontrada.", 404);
    return corrida;
  }
  historico(usuarioId: string, params: URLSearchParams) {
    validarUUID(usuarioId, "Usuário");
    return this.repository.historico(usuarioId, validarConsulta(historicoSchema, params));
  }
}
