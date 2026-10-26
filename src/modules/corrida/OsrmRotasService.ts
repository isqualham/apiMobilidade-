import { z } from "zod";
import { CorridaError, validarCoordenada } from "./CorridaDTO";
import { lerConfiguracaoOsrm, type ConfiguracaoOsrm } from "./ConfiguracaoOsrm";
import { RotasServiceNaoConfigurado, type RotasService } from "./RotasService";

const respostaRota = z.object({
  code: z.literal("Ok"),
  routes: z.array(z.object({
    distance: z.number().finite().positive().max(9999999999),
    duration: z.number().finite().nonnegative(),
  })).min(1),
});

// Compartilhado entre adaptadores no mesmo processo, inclusive os aliases públicos.
// Demonstração pública exige UMA instância; não é um limitador distribuído.
type LimitesOsrm = Map<string, { emVoo: boolean; proxima: number }>;
const globalOsrm = globalThis as unknown as { viauLimitesOsrm?: LimitesOsrm };
const limites = globalOsrm.viauLimitesOsrm ??= new Map();

async function lerJsonLimitado(resposta: Response): Promise<unknown> {
  const reader = resposta.body?.getReader();
  if (!reader) throw new CorridaError("Resposta vazia do serviço de rotas.", 502);
  const decoder = new TextDecoder();
  let bytes = 0;
  let texto = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) throw new CorridaError("Resposta do serviço de rotas excede o limite.", 502);
      texto += decoder.decode(value, { stream: true });
    }
    texto += decoder.decode();
    try { return JSON.parse(texto); } catch {
      throw new CorridaError("Resposta JSON inválida do serviço de rotas.", 502);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export class OsrmRotasService implements RotasService {
  constructor(
    private readonly config: ConfiguracaoOsrm,
    private readonly solicitar: typeof fetch = fetch,
  ) {}

  async calcularRota(entrada: Parameters<RotasService["calcularRota"]>[0]): Promise<{ distanciaMetros: number }> {
    for (const ponto of [entrada.origem, entrada.destino]) {
      validarCoordenada(ponto.latitude, "Latitude", 90);
      validarCoordenada(ponto.longitude, "Longitude", 180);
    }
    const { config } = this;
    const chave = config.publico ? "public-demo" : config.baseUrl.origin;
    const limite = limites.get(chave) ?? { emVoo: false, proxima: 0 };
    limites.set(chave, limite);
    if (limite.emVoo || Date.now() < limite.proxima) {
      throw new CorridaError("Limite de consultas de rotas atingido. Aguarde antes de tentar novamente.", 429);
    }
    limite.emVoo = true;
    limite.proxima = Date.now() + config.intervaloMs;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const coordenadas = [entrada.origem, entrada.destino]
        .map((p) => `${p.longitude},${p.latitude}`).join(";");
      const url = new URL(`route/v1/${config.profile}/${coordenadas}`, config.baseUrl);
      url.search = new URLSearchParams({
        overview: "false", steps: "false", alternatives: "false",
        generate_hints: "false", skip_waypoints: "true",
      }).toString();
      const resposta = await this.solicitar(url, {
        signal: controller.signal, redirect: "error", cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": config.userAgent },
      });
      if (resposta.status === 429 || resposta.status === 503) {
        const valor = resposta.headers.get("retry-after");
        const espera = valor && /^\d+$/.test(valor)
          ? Number(valor) * 1000
          : valor ? Date.parse(valor) - Date.now() : NaN;
        limite.proxima = Math.max(limite.proxima, Date.now() + (Number.isFinite(espera) ? Math.max(1000, espera) : 60000));
        await resposta.body?.cancel();
        throw new CorridaError("Serviço de rotas temporariamente indisponível. Tente mais tarde.", 503);
      }
      if (!resposta.ok && resposta.status !== 400) {
        await resposta.body?.cancel();
        throw new CorridaError("Falha na resposta do serviço de rotas.", 502);
      }
      const body = await lerJsonLimitado(resposta);
      if (body && typeof body === "object" && "code" in body && ["NoRoute", "NoSegment"].includes(String(body.code))) {
        throw new CorridaError("Não foi encontrada uma rota viária entre os pontos informados.", 422);
      }
      const validado = respostaRota.safeParse(body);
      if (!resposta.ok || !validado.success) throw new CorridaError("Resposta inválida do serviço de rotas.", 502);
      // OSRM fornece metros fracionários; normalizar ao metro mais próximo para Decimal(10,3).
      const distanciaMetros = Math.round(validado.data.routes[0].distance);
      if (distanciaMetros <= 0) throw new CorridaError("Distância da rota insuficiente.", 422);
      return { distanciaMetros };
    } catch (erro) {
      if (erro instanceof CorridaError) throw erro;
      if (controller.signal.aborted) throw new CorridaError("Tempo limite ao consultar o serviço de rotas.", 504);
      throw new CorridaError("Não foi possível consultar o serviço de rotas.", 503);
    } finally {
      clearTimeout(timer);
      limite.emVoo = false;
      // Espaçamento conservador também após o término da chamada.
      limite.proxima = Math.max(limite.proxima, Date.now() + config.intervaloMs);
    }
  }
}

export function criarRotasService(env: Record<string, string | undefined> = process.env): RotasService {
  const config = lerConfiguracaoOsrm(env);
  return config ? new OsrmRotasService(config) : new RotasServiceNaoConfigurado();
}
