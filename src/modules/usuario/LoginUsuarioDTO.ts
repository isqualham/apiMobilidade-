import { z } from "zod";

export const loginUsuarioSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(255)
    .transform((email) => email.toLowerCase()).optional(),

  telefone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Telefone deve estar em E.164.").optional(),

  senha: z.string().min(8, "Informe sua senha.").max(72, "Senha inválida."),
}).refine(data => (data.email !== undefined) !== (data.telefone !== undefined), {
  message: "Informe apenas e-mail ou telefone.",
  path: ["email"],
});

export type LoginUsuarioDTO = z.infer<typeof loginUsuarioSchema>;
