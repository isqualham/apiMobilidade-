import { z } from "zod";

function validarCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;

    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }

    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const primeiroDigito = calcularDigito(cpf.substring(0, 9), 10);
  const segundoDigito = calcularDigito(cpf.substring(0, 10), 11);

  return primeiroDigito === Number(cpf[9]) && segundoDigito === Number(cpf[10]);
}

export const cadastrarUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(150),

  cpf: z
    .string()
    .length(11, "O CPF deve conter 11 dígitos.")
    .regex(/^\d{11}$/, "Informe apenas os números do CPF.")
    .refine(validarCPF, "CPF inválido."),

  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(255)
    .transform((email) => email.toLowerCase()),

  telefone: z
    .string()
    .trim()
    .min(1, "O telefone é obrigatório.")
    .max(20)
    .regex(
      /^\+55\d{10,11}$/,
      "Informe o telefone com +55, DDD e número. Exemplo: +5565999999999",
    ),

  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72),

  aceitouTermos: z.literal(true, {
    error: "Você precisa aceitar os Termos de Uso para se cadastrar.",
  }),
});

export type CadastrarUsuarioDTO = z.infer<typeof cadastrarUsuarioSchema>;
