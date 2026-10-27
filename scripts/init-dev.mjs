import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";

export function etapasInicializacao(env) {
  if (env.NODE_ENV !== "development" || env.VIAU_ENVIRONMENT !== "development") {
    throw new Error("Inicialização Docker permitida somente em development.");
  }
  if (env.VIAU_SEED_CONFIRM !== "desenvolvimento") throw new Error("Confirmação de desenvolvimento ausente.");
  if (!["true", "false"].includes(env.VIAU_AUTO_SEED ?? "true")) throw new Error("VIAU_AUTO_SEED deve ser true ou false.");
  let url;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch { throw new Error("DATABASE_URL inválida."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "db" ||
      (url.port && url.port !== "5432") || !["mobilidade_db", "viau_test"].includes(url.pathname.slice(1))) {
    throw new Error("Inicialização bloqueada: use somente o PostgreSQL db:5432 de desenvolvimento.");
  }
  const etapas = [
    ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"],
    ["node_modules/prisma/build/index.js", "generate", "--config", "prisma7.config.ts"],
  ];
  // Seeds são exclusivamente manuais, inclusive se VIAU_AUTO_SEED=true.
  return etapas;
}

export function inicializar(env, executar = spawnSync) {
  const etapas = etapasInicializacao(env); // Validar tudo antes de qualquer comando/banco.
  for (const args of etapas) {
    const resultado = executar(process.execPath, args, { stdio: "inherit", env });
    if (resultado.error || resultado.status !== 0) throw new Error("Preparação de desenvolvimento falhou; API deve permanecer bloqueada.");
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  config({ quiet: true });
  try {
    inicializar(process.env);
    console.log("Preparação concluída. Seeds disponíveis somente por execução manual.");
  } catch (erro) {
    console.error(erro instanceof Error ? erro.message : "Inicialização interrompida.");
    process.exitCode = 1;
  }
}
