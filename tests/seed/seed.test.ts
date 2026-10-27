import type { PrismaClient } from "@/generated/prisma/client";
import { executarSeed } from "../../scripts/seed/executar";
import { expect, it } from "vitest";
import { validarAmbienteSeed } from "../../scripts/seed/ambiente";
import { contasSeed, veiculosSeed } from "../../scripts/seed/dados";
import { cadastrarUsuarioSchema } from "@/modules/usuario/CadastrarUsuarioDTO";
import { loginUsuarioSchema } from "@/modules/usuario/LoginUsuarioDTO";
const env = { NODE_ENV: "development", VIAU_ENVIRONMENT: "development", VIAU_SEED_CONFIRM: "desenvolvimento", DATABASE_URL: "postgresql://unused:unused@db:5432/mobilidade_db" };
it.each(["production", "", undefined, "demo"])("bloqueia NODE_ENV=%s", NODE_ENV => {
  expect(() => validarAmbienteSeed({ ...env, NODE_ENV })).toThrow();
});
it("bloqueia ambiente ViaU de produção mesmo com NODE_ENV development", () => {
  expect(() => validarAmbienteSeed({ ...env, VIAU_ENVIRONMENT: "production" })).toThrow();
});
it("exige confirmação manual", () => {
  expect(() => validarAmbienteSeed({ ...env, VIAU_SEED_CONFIRM: undefined })).toThrow();
});
it.each(["postgresql://u:p@remoto.example/mobilidade_db", "postgresql://u:p@localhost/producao", "https://db/mobilidade_db", "invalida"])("bloqueia conexão %s", DATABASE_URL => {
  expect(() => validarAmbienteSeed({ ...env, DATABASE_URL })).toThrow();
});
it("aceita o Docker local de desenvolvimento", () => {
  expect(validarAmbienteSeed(env)).toEqual({ host: "db", banco: "mobilidade_db" });
});
it("dados sintéticos passam pelas validações reais de cadastro/login", () => {
  for (const conta of contasSeed) {
    expect(cadastrarUsuarioSchema.safeParse({ ...conta, senha: "teste1234", aceitouTermos: true }).success).toBe(true);
    expect(loginUsuarioSchema.safeParse({ email: conta.email, senha: "teste1234" }).success).toBe(true);
  }
  for (const campo of ["id", "email", "cpf", "telefone"] as const) expect(new Set(contasSeed.map(c => c[campo])).size).toBe(4);
  expect(new Set(veiculosSeed.map(v => v.placa)).size).toBe(2);
});
it("seed rejeita senha curta antes de acessar o banco", async () => {
  await expect(executarSeed({} as PrismaClient, { env, senha: "curta", categorias: {} })).rejects.toThrow("entre 8 e 72");
});
