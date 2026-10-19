import { z } from "zod";

export const loginUsuarioSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((email) => email.toLowerCase()),
  senha: z.string().min(1).max(72),
});

export type LoginUsuarioDTO = z.infer<typeof loginUsuarioSchema>;
