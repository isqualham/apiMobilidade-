import { CorridaError } from "./CorridaDTO";

export interface ConfiguracaoOsrm {
  baseUrl: URL;
  publico: boolean;
  timeoutMs: number;
  intervaloMs: number;
  profile: string;
  userAgent: string;
}

function invalida(): never {
  throw new CorridaError("Configuração do serviço de rotas inválida ou não autorizada para este ambiente.", 503);
}

export function lerConfiguracaoOsrm(env: Record<string, string | undefined>): ConfiguracaoOsrm | null {
  if (!env.OSRM_BASE_URL?.trim()) return null;
  let baseUrl: URL;
  try { baseUrl = new URL(env.OSRM_BASE_URL); } catch { return invalida(); }
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) invalida();

  // Domínios somente para a política de bloqueio, nunca como URL de fallback.
  const host = baseUrl.hostname.toLowerCase().replace(/\.$/, "");
  const publico = ["project-osrm.org", "routing.openstreetmap.de"].some(
    (dominio) => host === dominio || host.endsWith(`.${dominio}`),
  );
  const ambiente = env.VIAU_ENVIRONMENT ?? (env.NODE_ENV === "development" ? "development" : "production");
  if (!["development", "demo", "production"].includes(ambiente)) invalida();
  const tipo = env.OSRM_PROVIDER_KIND;
  if (!["public-demo", "self-hosted", "authorized"].includes(tipo ?? "")) invalida();
  if (publico && (tipo !== "public-demo" || ambiente === "production" || baseUrl.protocol !== "https:")) invalida();
  if (publico && env.NODE_ENV === "production" && ambiente === "development") invalida();
  if (tipo === "public-demo" && (!publico || ambiente === "production")) invalida();
  if (baseUrl.protocol === "http:" && tipo !== "self-hosted") invalida();

  const timeoutMs = Number(env.OSRM_TIMEOUT_MS ?? "5000");
  const intervaloMs = Number(env.OSRM_MIN_INTERVAL_MS ?? "1000");
  const profile = env.OSRM_PROFILE ?? "driving";
  const userAgent = env.OSRM_USER_AGENT ?? "ViaU/1.0";
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) invalida();
  if (!Number.isInteger(intervaloMs) || intervaloMs < (publico ? 1000 : 0) || intervaloMs > 60000) invalida();
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(profile)) invalida();
  if (!/^[\x20-\x7E]{3,200}$/.test(userAgent) || !userAgent.trim()) invalida();
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
  return { baseUrl, publico, timeoutMs, intervaloMs, profile, userAgent };
}
