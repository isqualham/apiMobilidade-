import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lerConfiguracaoOsrm } from "@/modules/corrida/ConfiguracaoOsrm";
import { criarRotasService, OsrmRotasService } from "@/modules/corrida/OsrmRotasService";
import { SolicitarCorridaUseCase } from "@/modules/corrida/SolicitarCorridaUseCase";
import type { CorridaRepository } from "@/modules/corrida/CorridaRepository";
import type { TarifaCategoriaRepository } from "@/modules/tarifa/TarifaCategoriaRepository";

const publica = { OSRM_BASE_URL: "https://router.project-osrm.org", VIAU_ENVIRONMENT: "demo", OSRM_PROVIDER_KIND: "public-demo", OSRM_MIN_INTERVAL_MS: "1000" };
const entrada = {
  origem: { latitude: -16.07, longitude: -57.67 },
  destino: { latitude: -16.08, longitude: -57.69 },
  categoriaVeiculoId: "00000000-0000-4000-8000-000000000002",
};
const ok = () => Response.json({ code: "Ok", routes: [{ distance: 1005.4, duration: 200 }] });
let numero = 0;
function adaptador(fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok()), env: Record<string, string | undefined> = {}) {
  const config = lerConfiguracaoOsrm({
    OSRM_BASE_URL: `https://osrm-${++numero}.test/prefixo`,
    OSRM_PROVIDER_KIND: "authorized", VIAU_ENVIRONMENT: "production",
    OSRM_MIN_INTERVAL_MS: "0", ...env,
  })!;
  return { service: new OsrmRotasService(config, fetchMock), fetchMock };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("Configuração OSRM", () => {
  it("não tem URL pública como fallback", async () => {
    expect(lerConfiguracaoOsrm({})).toBeNull();
    await expect(criarRotasService({}).calcularRota(entrada)).rejects.toMatchObject({ statusCode: 503 });
  });
  it.each(["development", "demo"])("permite público explicitamente em %s", (ambiente) => {
    expect(lerConfiguracaoOsrm({ ...publica, VIAU_ENVIRONMENT: ambiente })?.publico).toBe(true);
  });
  it("permite build production usado explicitamente como demonstração", () => {
    expect(lerConfiguracaoOsrm({ ...publica, NODE_ENV: "production" })?.publico).toBe(true);
  });
  it("não reaproveita configuração de desenvolvimento em next start", () => {
    expect(() => lerConfiguracaoOsrm({ ...publica, VIAU_ENVIRONMENT: "development", NODE_ENV: "production" })).toThrow();
  });
  it.each(["https://router.project-osrm.org", "https://ROUTER.PROJECT-OSRM.ORG.", "https://routing.openstreetmap.de/routed-car"])("bloqueia público em produção: %s", (url) => {
    expect(() => lerConfiguracaoOsrm({ ...publica, OSRM_BASE_URL: url, VIAU_ENVIRONMENT: "production" })).toThrow("não autorizada");
    expect(() => lerConfiguracaoOsrm({ OSRM_BASE_URL: url, OSRM_PROVIDER_KIND: "self-hosted" })).toThrow("não autorizada");
  });
  it("sem ambiente explicitado, assume produção fora de next dev", () => {
    expect(() => lerConfiguracaoOsrm({ OSRM_BASE_URL: publica.OSRM_BASE_URL, OSRM_PROVIDER_KIND: "public-demo", NODE_ENV: "production" })).toThrow();
  });
  it.each(["self-hosted", "authorized"])("permite %s em produção", (tipo) => {
    expect(lerConfiguracaoOsrm({ OSRM_BASE_URL: "https://rotas.exemplo.test", OSRM_PROVIDER_KIND: tipo })?.publico).toBe(false);
  });
  it.each([
    { OSRM_BASE_URL: "nao-url" }, { OSRM_BASE_URL: "ftp://osrm.test" },
    { OSRM_BASE_URL: "https://usuario:senha@osrm.test" },
    { OSRM_BASE_URL: "https://osrm.test?segredo=1" },
    { OSRM_BASE_URL: "https://osrm.test#fragmento" },
    { OSRM_BASE_URL: "http://router.project-osrm.org" },
    { OSRM_PROVIDER_KIND: "authorized" }, { OSRM_TIMEOUT_MS: "NaN" },
    { OSRM_TIMEOUT_MS: "0" }, { OSRM_TIMEOUT_MS: "30001" },
    { OSRM_MIN_INTERVAL_MS: "999" }, { OSRM_MIN_INTERVAL_MS: "-1" },
    { OSRM_PROFILE: "../../foo" }, { OSRM_USER_AGENT: "ViaU\r\nX: 1" },
    { VIAU_ENVIRONMENT: "prodution" },
  ])("rejeita configuração inválida %j", (alteracao) => {
    expect(() => lerConfiguracaoOsrm({ ...publica, ...alteracao })).toThrow();
  });
  it("aceita HTTP somente para instância própria", () => {
    expect(lerConfiguracaoOsrm({ OSRM_BASE_URL: "http://localhost:5000", OSRM_PROVIDER_KIND: "self-hosted" })).not.toBeNull();
    expect(() => lerConfiguracaoOsrm({ OSRM_BASE_URL: "http://rotas.test", OSRM_PROVIDER_KIND: "authorized" })).toThrow();
  });
});

describe("Adaptador OSRM sem chamadas ao servidor público", () => {
  it("envia longitude/latitude, preserva prefixo, identifica ViaU e normaliza metros", async () => {
    const { service, fetchMock } = adaptador();
    await expect(service.calcularRota(entrada)).resolves.toEqual({ distanciaMetros: 1005 });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/prefixo/route/v1/driving/-57.67,-16.07;-57.69,-16.08?");
    expect(String(url)).toContain("overview=false");
    expect(opcoes).toMatchObject({ redirect: "error", cache: "no-store", headers: { "User-Agent": "ViaU/1.0" } });
  });
  it.each([0, -1, "1000", null, 1e20])("rejeita distância inválida %j", async (distance) => {
    const { service } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "Ok", routes: [{ distance, duration: 1 }] })));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 502 });
  });
  it.each([{}, { code: "Ok", routes: [] }, { code: "Ok", routes: [{ distance: 100 }] }, { code: "InvalidQuery" }])("valida formato %j", async (body) => {
    const { service } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(Response.json(body)));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 502 });
  });
  it.each(["NoRoute", "NoSegment"])("retorna 422 para %s sem fallback", async (code) => {
    const { service, fetchMock } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code }, { status: 400 })));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 422 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("não aceita uma rota que arredonde para zero", async () => {
    const { service } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "Ok", routes: [{ distance: 0.1, duration: 1 }] })));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 422 });
  });
  it.each([new Response("<html>erro</html>"), new Response("x".repeat(65537))])("rejeita JSON inválido ou excessivo", async (resposta) => {
    const { service } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(resposta));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 502 });
  });
  it.each([301, 401, 500])("trata HTTP %i sem repetir", async (status) => {
    const { service, fetchMock } = adaptador(vi.fn<typeof fetch>().mockResolvedValue(new Response("erro", { status })));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("trata rede indisponível sem fallback", async () => {
    const { service } = adaptador(vi.fn<typeof fetch>().mockRejectedValue(new TypeError("segredo do provedor")));
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 503, message: "Não foi possível consultar o serviço de rotas." });
  });
  it("aborta por timeout", async () => {
    vi.useFakeTimers();
    const { service } = adaptador(vi.fn<typeof fetch>().mockImplementation((_url, opcoes) => new Promise((_resolve, reject) => {
      opcoes?.signal?.addEventListener("abort", () => reject(new Error("abort")));
    })), { OSRM_TIMEOUT_MS: "100" });
    const resultado = expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 504 });
    await vi.advanceTimersByTimeAsync(101);
    await resultado;
  });
  it("coordenadas inválidas não chegam ao provedor", async () => {
    const { service, fetchMock } = adaptador();
    await expect(service.calcularRota({ ...entrada, origem: { latitude: 91, longitude: 0 } })).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("o timeout também cobre a leitura do corpo", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_url, opcoes) => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"code":'));
          opcoes?.signal?.addEventListener("abort", () => controller.error(new Error("abort")));
        },
      });
      return new Response(body);
    });
    const { service } = adaptador(fetchMock, { OSRM_TIMEOUT_MS: "100" });
    const resultado = expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 504 });
    await vi.advanceTimersByTimeAsync(101);
    await resultado;
  });
  it("integra distância OSRM ao cálculo monetário do caso de uso", async () => {
    const { service } = adaptador();
    const criar = vi.fn();
    const useCase = new SolicitarCorridaUseCase({ criar } as unknown as CorridaRepository, {
      categoriaAtivaExiste: vi.fn().mockResolvedValue(true),
      buscarPorCategoria: vi.fn().mockResolvedValue({ ativo: true, valorKm: 1, tarifaMinima: 0.01, taxaPartida: 0 }),
    } as unknown as TarifaCategoriaRepository, service);
    await useCase.executar({
      passageiroId: "00000000-0000-4000-8000-000000000001", categoriaVeiculoId: entrada.categoriaVeiculoId,
      origemEndereco: "Origem", destinoEndereco: "Destino",
      origemLatitude: entrada.origem.latitude, origemLongitude: entrada.origem.longitude,
      destinoLatitude: entrada.destino.latitude, destinoLongitude: entrada.destino.longitude,
    });
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ distanciaKm: "1.005", valorTotal: "1.01" }));
  });
});

describe("Limites de uso", () => {
  beforeEach(() => vi.useFakeTimers());
  it("não abre uma segunda consulta enquanto a primeira está em voo", async () => {
    let liberar!: (resposta: Response) => void;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => { liberar = resolve; }));
    const { service } = adaptador(fetchMock);
    const primeira = service.calcularRota(entrada);
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 429 });
    liberar(ok());
    await primeira;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("aplica pausa conservadora quando o provedor não informa Retry-After válido", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503, headers: { "Retry-After": "inválido" } }))
      .mockResolvedValueOnce(ok());
    const { service } = adaptador(fetchMock);
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 503 });
    await vi.advanceTimersByTimeAsync(59000);
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 429 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(service.calcularRota(entrada)).resolves.toEqual({ distanciaMetros: 1005 });
  });
  it("limita público a uma chamada por segundo, inclusive entre adaptadores", async () => {
    vi.setSystemTime(new Date("2030-01-01"));
    const a = adaptador(undefined, publica);
    const b = adaptador(undefined, publica);
    await a.service.calcularRota(entrada);
    await expect(b.service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 429 });
    expect(b.fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(b.service.calcularRota(entrada)).resolves.toEqual({ distanciaMetros: 1005 });
  });
  it.each(["120", new Date("2031-01-01T00:02:00Z").toUTCString()])("respeita Retry-After %s", async (retryAfter) => {
    vi.setSystemTime(new Date("2031-01-01"));
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": retryAfter } }))
      .mockResolvedValueOnce(ok());
    const { service } = adaptador(fetchMock);
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 503 });
    await vi.advanceTimersByTimeAsync(119000);
    await expect(service.calcularRota(entrada)).rejects.toMatchObject({ statusCode: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(service.calcularRota(entrada)).resolves.toEqual({ distanciaMetros: 1005 });
  });
});
