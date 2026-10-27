import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Não carrega o .env de desenvolvimento. Conexão deve ser injetada pelo deploy.
export function migrarProducao(env, executar = spawnSync) {
  if (env.NODE_ENV !== "production" || env.VIAU_ENVIRONMENT !== "production") {
    throw new Error("Migrations de produção exigem ambos os ambientes explicitamente production.");
  }
  let url;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch { throw new Error("Injete DATABASE_URL exclusiva de produção."); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const banco = decodeURIComponent(url.pathname.slice(1)).toLowerCase();
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !banco ||
      ["db", "apimobilidade-db", "localhost", "127.0.0.1", "[::1]", "host.docker.internal"].includes(host) ||
      ["mobilidade_db", "viau_test"].includes(banco) || url.searchParams.has("host")) {
    throw new Error("Produção não pode reutilizar o host ou banco reservado ao desenvolvimento/testes.");
  }
  const resultado = executar(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"], { env, stdio: "inherit" });
  if (resultado.error || resultado.status !== 0) throw new Error("Migration de produção falhou.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { migrarProducao(process.env); }
  catch (erro) { console.error(erro instanceof Error ? erro.message : "Migration interrompida."); process.exitCode = 1; }
}
