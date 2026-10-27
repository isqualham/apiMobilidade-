import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { executarSeed } from "../../scripts/seed/executar";
import { prepararDocumentosDev } from "../../scripts/seed/documentos";
import { migrarProducao } from "../../scripts/migrate-production.mjs";
import { inicializar } from "../../scripts/init-dev.mjs";
const dev = { NODE_ENV: "development", VIAU_ENVIRONMENT: "development", VIAU_SEED_CONFIRM: "desenvolvimento", VIAU_AUTO_SEED: "true", DATABASE_URL: "postgresql://unused:unused@db/mobilidade_db" };
it.each([
  { NODE_ENV: "production" }, { VIAU_ENVIRONMENT: "production" },
  { NODE_ENV: undefined }, { VIAU_ENVIRONMENT: undefined },
  { NODE_ENV: "test" }, { VIAU_ENVIRONMENT: "test" },
  { NODE_ENV: "production", VIAU_ENVIRONMENT: "production" },
])("seed e documentos não chegam ao banco com auto-seed ligada: %j", async alteracao => {
  const banco = { $transaction: vi.fn() };
  const env = { ...dev, ...alteracao };
  await expect(executarSeed(banco as unknown as PrismaClient, { env, senha: "teste1234", categorias: {} })).rejects.toThrow();
  await expect(prepararDocumentosDev(banco as unknown as PrismaClient, env)).rejects.toThrow();
  expect(banco.$transaction).not.toHaveBeenCalled();
  const comando = vi.fn();
  expect(() => inicializar(env, comando)).toThrow();
  expect(comando).not.toHaveBeenCalled();
});
const prod = { NODE_ENV: "production", VIAU_ENVIRONMENT: "production", VIAU_AUTO_SEED: "true", DATABASE_URL: "postgresql://unused:unused@postgres-production.example/viau_production" };
it("produção permite somente migrate deploy mesmo com AUTO_SEED=true", () => {
  const comando = vi.fn().mockReturnValue({ status: 0 });
  migrarProducao(prod, comando);
  expect(comando).toHaveBeenCalledTimes(1);
  expect(comando.mock.calls[0][1]).toEqual(["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"]);
});
it.each([dev.DATABASE_URL, "postgresql://u:p@postgres-production.example/mobilidade_db", "postgresql://u:p@localhost/viau_production", "postgresql://u:p@postgres-production.example/viau_test"])("produção rejeita banco/host de desenvolvimento: %s", DATABASE_URL => {
  const comando = vi.fn();
  expect(() => migrarProducao({ ...prod, DATABASE_URL }, comando)).toThrow();
  expect(comando).not.toHaveBeenCalled();
});
