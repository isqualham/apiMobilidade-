import { z } from "zod";
export const cotarCorridaSchema = z.strictObject({
  categoriaVeiculoId: z.uuid(),
  origemLatitude: z.number().finite().min(-90).max(90),
  origemLongitude: z.number().finite().min(-180).max(180),
  destinoLatitude: z.number().finite().min(-90).max(90),
  destinoLongitude: z.number().finite().min(-180).max(180),
  origemEndereco: z.string().trim().min(1).max(500).optional(),
  destinoEndereco: z.string().trim().min(1).max(500).optional(),
});
export type CotarCorridaDTO = z.infer<typeof cotarCorridaSchema>;
export interface CotacaoCorridaDTO {
  categoriaVeiculoId: string;
  valorTotal: number;
  distanciaKm: number;
  duracaoSegundos: number | null;
}
