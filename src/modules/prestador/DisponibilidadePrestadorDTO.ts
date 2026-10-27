import { z } from "zod";
export const disponibilidadeSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("ONLINE"), veiculoId: z.uuid(), versao: z.number().int().min(0).max(2147483646) }),
  z.strictObject({ status: z.literal("OFFLINE"), versao: z.number().int().min(0).max(2147483646) }),
]);
export type AlterarDisponibilidadeDTO = z.infer<typeof disponibilidadeSchema>;
export interface DisponibilidadePrestadorDTO {
  status: "ONLINE" | "OFFLINE";
  veiculoId: string | null;
  versao: number;
}
