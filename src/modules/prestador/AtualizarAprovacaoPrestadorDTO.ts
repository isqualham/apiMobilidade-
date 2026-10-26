import { z } from "zod";
import { StatusAprovacao } from "@/generated/prisma/enums";

export const decisaoPrestadorSchema = z.strictObject({
  statusAprovacao: z.enum([StatusAprovacao.APROVADO, StatusAprovacao.REJEITADO]),
});

export interface AtualizarAprovacaoPrestadorDTO {
  prestadorId: string;
  administradorId: string;
  statusAprovacao: z.infer<typeof decisaoPrestadorSchema>["statusAprovacao"];
}

export interface AprovacaoPrestadorResponseDTO {
  id: string;
  usuarioId: string;
  statusAprovacao: StatusAprovacao;
  updatedAt: Date;
}

export class PrestadorError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message);
    this.name = "PrestadorError";
  }
}
