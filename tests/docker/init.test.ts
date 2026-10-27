import { expect, it, vi } from "vitest";
import { etapasInicializacao, inicializar } from "../../scripts/init-dev.mjs";
const env = { NODE_ENV: "development", VIAU_ENVIRONMENT: "development", VIAU_SEED_CONFIRM: "desenvolvimento", DATABASE_URL: "postgresql://unused:unused@db:5432/mobilidade_db" };
it("ordena somente migrations e geração", () => {
  const etapas = etapasInicializacao(env);
  expect(etapas).toHaveLength(2);
  expect(etapas[0]).toContain("deploy"); expect(etapas[1]).toContain("generate");

});
it("desabilitar seed preserva migrations e geração, sem criar documentos", () => {
  expect(etapasInicializacao({ ...env, VIAU_AUTO_SEED: "false" })).toHaveLength(2);
});
it.each([
  { NODE_ENV: "production" }, { VIAU_ENVIRONMENT: "production" },
  { NODE_ENV: undefined }, { VIAU_SEED_CONFIRM: "" }, { VIAU_AUTO_SEED: "talvez" },
  { DATABASE_URL: "postgresql://u:p@prod.example/mobilidade_db" },
  { DATABASE_URL: "postgresql://u:p@db/producao" },
])("bloqueia configuração insegura antes de executar comandos: %j", alteracao => {
  const executar = vi.fn();
  expect(() => inicializar({ ...env, ...alteracao }, executar)).toThrow();
  expect(executar).not.toHaveBeenCalled();
});
it("interrompe sequência quando migration falha", () => {
  const executar = vi.fn().mockReturnValue({ status: 1 });
  expect(() => inicializar(env, executar)).toThrow("API deve permanecer bloqueada");
  expect(executar).toHaveBeenCalledTimes(1);
});
it("não executa seed nem documentos mesmo com VIAU_AUTO_SEED=true", () => {
  const executar = vi.fn().mockReturnValue({ status: 0 });
  inicializar({ ...env, VIAU_AUTO_SEED: "true" }, executar);
  expect(executar).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(executar.mock.calls)).not.toContain("scripts/seed");
});
