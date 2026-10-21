import { z } from "zod";

export const loginUsuarioSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(255)
    .transform((email) => email.toLowerCase()),

  senha: z.string().min(8, "Informe sua senha.").max(72, "Senha inválida."),
});

export type LoginUsuarioDTO = z.infer<typeof loginUsuarioSchema>;
