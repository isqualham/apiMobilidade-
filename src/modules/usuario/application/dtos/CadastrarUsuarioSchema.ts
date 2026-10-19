import { z } from "zod";

export const cadastrarUsuarioSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((email) => email.toLowerCase()),
  telefone: z.string().trim().max(20).optional(),
  senha: z.string().min(8).max(72),
});

export type CadastrarUsuarioDTO = z.infer<typeof cadastrarUsuarioSchema>;
