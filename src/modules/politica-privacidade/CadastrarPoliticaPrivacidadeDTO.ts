import { z } from "zod";

export const cadastrarPoliticaPrivacidadeSchema = z.object({
  versao: z
    .string()
    .trim()
    .min(1, "A versão é obrigatória.")
    .max(20, "A versão deve ter no máximo 20 caracteres."),
  conteudo: z
    .string()
    .trim()
    .min(1, "O conteúdo da política de privacidade é obrigatório."),
  ativo: z.boolean().optional().default(true),
});

export type CadastrarPoliticaPrivacidadeDTO = z.infer<
  typeof cadastrarPoliticaPrivacidadeSchema
>;
