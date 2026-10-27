import { expect, it, vi } from "vitest";
import { loginUsuarioSchema } from "@/modules/usuario/LoginUsuarioDTO";
import { PrismaUsuarioRepository } from "@/modules/usuario/PrismaUsuarioRepository";
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/prisma", () => ({ prisma: { usuario: { findUnique } } }));

it("preserva normalização do e-mail", () => {
  expect(loginUsuarioSchema.parse({ email: " TESTE@EXAMPLE.COM ", senha: "teste1234" }).email).toBe("teste@example.com");
});
it("preserva E.164 exatamente e consulta pela coluna telefone", async () => {
  const dados = loginUsuarioSchema.parse({ telefone: "+5565990000001", senha: "teste1234" });
  expect(dados.telefone).toBe("+5565990000001");
  await new PrismaUsuarioRepository().buscarPorTelefone(dados.telefone!);
  expect(findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ where: { telefone: "+5565990000001" } }));
});
it.each([
  {}, { telefone: "65990000001" }, { telefone: "5565990000001" },
  { telefone: "+55 (65) 99000-0001" }, { telefone: " +5565990000001 " },
  { telefone: "+012345678" }, { telefone: "+1234567890123456" },
  { email: "incorreto" }, { email: "teste@example.com", telefone: "+5565990000001" },
])("rejeita identificador inválido ou ambíguo: %j", identificador => {
  expect(loginUsuarioSchema.safeParse({ ...identificador, senha: "teste1234" }).success).toBe(false);
});
