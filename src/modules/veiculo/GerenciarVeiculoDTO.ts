import { z } from "zod";
export const statusVeiculo = z.enum(["PENDENTE", "APROVADO", "REJEITADO", "SUSPENSO"]);
const versao = z.number().int().min(0).max(2147483646);
export const decisaoVeiculoSchema = z.strictObject({
  statusAprovacao: z.enum(["APROVADO", "REJEITADO", "SUSPENSO"]),
  motivo: z.string().trim().min(5).max(1000), versao,
});
export const editarVeiculoSchema = z.strictObject({
  versao, categoriaVeiculoId: z.uuid().optional(), placa: z.string().optional(),
  marca: z.string().optional(), modelo: z.string().optional(), ano: z.number().int().optional(),
  cor: z.string().nullable().optional(), imagemUrl: z.string().nullable().optional(), ativo: z.boolean().optional(),
}).refine(dados => Object.keys(dados).length > 1, "Informe ao menos um campo para alterar.");
export const paginaVeiculoSchema = z.strictObject({
  limite: z.coerce.number().int().min(1).max(50).default(20), cursor: z.uuid().optional(),
});
export const listaVeiculoSchema = paginaVeiculoSchema.extend({ status: statusVeiculo.optional() });
export type DecisaoVeiculoDTO = z.infer<typeof decisaoVeiculoSchema>;
export type EditarVeiculoDTO = z.infer<typeof editarVeiculoSchema>;
export type ListaVeiculoDTO = z.infer<typeof listaVeiculoSchema>;
export type PaginaVeiculoDTO = z.infer<typeof paginaVeiculoSchema>;
export const camposImportantes = ["categoriaVeiculoId", "placa", "marca", "modelo", "ano", "cor"] as const;
export function transicaoVeiculoPermitida(anterior: z.infer<typeof statusVeiculo>, novo: DecisaoVeiculoDTO["statusAprovacao"]) {
  const destinos = {
    PENDENTE: ["APROVADO", "REJEITADO", "SUSPENSO"],
    APROVADO: ["SUSPENSO"],
    REJEITADO: ["APROVADO", "SUSPENSO"],
    SUSPENSO: ["APROVADO", "REJEITADO"],
  };
  return destinos[anterior].includes(novo);
}
