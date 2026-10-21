import { z } from "zod";

export const cadastrarTermoUsoSchema = z.object({
  versao: z.string().trim().min(1, "A versão é obrigatória."),
  conteudo: z.string().trim().min(1, "O conteúdo do termo é obrigatório."),
  ativo: z.boolean().default(false),
});

export type CadastrarTermoUsoDTO = z.infer<typeof cadastrarTermoUsoSchema>;
