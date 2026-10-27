export class SeedError extends Error {}

export function validarAmbienteSeed(env: Record<string, string | undefined>) {
  if (
    env.NODE_ENV !== "development" ||
    env.VIAU_ENVIRONMENT !== "development"
  ) {
    throw new SeedError(
      "Seed permitida somente com NODE_ENV=development e VIAU_ENVIRONMENT=development explícitos.",
    );
  }

  if (env.VIAU_SEED_CONFIRM !== "desenvolvimento") {
    throw new SeedError(
      "Confirme a execução manual com VIAU_SEED_CONFIRM=desenvolvimento.",
    );
  }

  let url: URL;

  try {
    url = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new SeedError("DATABASE_URL inválida.");
  }

  const host = url.hostname.toLowerCase();
  const banco = decodeURIComponent(url.pathname.slice(1));

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new SeedError("Protocolo PostgreSQL inválido.");
  }

  const bancoLocal =
    ["db", "localhost", "127.0.0.1", "[::1]"].includes(host) &&
    ["mobilidade_db", "viau_test"].includes(banco);

  const bancoNeon = host.endsWith(".neon.tech") && banco === "neondb";

  if (!bancoLocal && !bancoNeon) {
    throw new SeedError(
      "Seed bloqueada: banco não autorizado para desenvolvimento.",
    );
  }

  if (bancoNeon && env.VIAU_SEED_NEON_CONFIRM !== "autorizar-neon") {
    throw new SeedError(
      "Para executar a seed no Neon, informe VIAU_SEED_NEON_CONFIRM=autorizar-neon.",
    );
  }

  return {
    host,
    banco,
  };
}
