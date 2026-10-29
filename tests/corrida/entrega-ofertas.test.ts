import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
const mocks = vi.hoisted(() => ({
  autenticar: vi.fn(), prestador: vi.fn(), veiculo: vi.fn(), corridas: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: async (callback: (tx: unknown) => unknown) => callback({
    prestador: { findFirst: mocks.prestador },
    veiculo: { findFirst: mocks.veiculo },
    corrida: { findMany: mocks.corridas },
  }),
} }));
vi.mock("@/modules/auth/AutenticarRequisicao", async original => ({
  ...await original<typeof import("@/modules/auth/AutenticarRequisicao")>(),
  autenticarRequisicao: mocks.autenticar,
}));
import { GET } from "@/app/api/corrida/disponiveis/route";
import { TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
import { diagnosticarOfertas } from "@/modules/corrida/DiagnosticoOfertas";
import { STATUS_ATIVOS, codificarCursor } from "@/modules/corrida/ConsultaCorridaDTO";

const usuario = "00000000-0000-4000-8000-000000000001";
const prestador = "00000000-0000-4000-8000-000000000002";
const veiculo = "00000000-0000-4000-8000-000000000003";
const categoria = "00000000-0000-4000-8000-000000000004";
const corrida = "00000000-0000-4000-8000-000000000005";
const data = new Date("2026-10-01T00:00:00.000Z");
const oferta = {
  id: corrida, status: "SOLICITADA", categoriaVeiculoId: categoria,
  distanciaKm: new Prisma.Decimal("3.25"), valorTotal: new Prisma.Decimal("12.50"),
  createdAt: data, origemLatitude: new Prisma.Decimal("-16.1234567"),
  origemLongitude: new Prisma.Decimal("-56.1234567"),
  destinoLatitude: new Prisma.Decimal("-16.2345678"), destinoLongitude: new Prisma.Decimal("-56.2345678"),
};
const request = (query = "") => new Request("http://localhost/api/corrida/disponiveis" + query);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VIAU_ENVIRONMENT", "development");
  vi.stubEnv("VIAU_DIAGNOSTICO_OFERTAS", "true");
  vi.spyOn(console, "info").mockImplementation(() => {});
  mocks.autenticar.mockResolvedValue({ id: usuario });
  mocks.prestador.mockResolvedValue({ id: prestador, veiculoOnlineId: veiculo, corridas: [] });
  mocks.veiculo.mockResolvedValue({ categoriaVeiculoId: categoria });
  mocks.corridas.mockResolvedValue([oferta]);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it.each(["", "?veiculoId=" + veiculo])("rota entrega oferta elegível com contrato privado %s", async query => {
  const resposta = await GET(request(query));
  expect(resposta.status).toBe(200);
  expect(resposta.headers.get("cache-control")).toBe("private, no-store");
  expect(resposta.headers.get("vary")).toBe("Authorization");
  expect(await resposta.json()).toEqual({
    corridas: [{
      id: corrida, status: "SOLICITADA", categoriaVeiculoId: categoria,
      distanciaKm: 3.25, valorTotal: 12.5, createdAt: data.toISOString(),
      origemAproximada: { latitude: -16.12, longitude: -56.12 },
      destinoAproximado: { latitude: -16.23, longitude: -56.23 },
    }], proximoCursor: null,
  });
  expect(mocks.prestador).toHaveBeenCalledWith({
    where: { usuarioId: usuario, statusAprovacao: "APROVADO", usuario: { ativo: true } },
    select: { id: true, veiculoOnlineId: true,
      corridas: { where: { status: { in: STATUS_ATIVOS } }, select: { id: true }, take: 1 } },
  });
  expect(mocks.veiculo).toHaveBeenCalledWith({
    where: { id: veiculo, prestadorId: prestador, ativo: true, statusAprovacao: "APROVADO",
      categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } },
    select: { categoriaVeiculoId: true },
  });
  expect(mocks.corridas.mock.calls[0][0].where).toEqual({ AND: [
    { status: "SOLICITADA", prestadorId: null, passageiroId: { not: usuario },
      passageiro: { ativo: true }, categoriaVeiculoId: categoria },
    { recusas: { none: { prestadorId: prestador } } }, {},
  ] });
  const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
  for (const privado of [usuario, prestador, veiculo, categoria, corrida, "-16.12", "12.5"]) {
    expect(logs).not.toContain(privado);
  }
});
it.each([
  ["PRESTADOR_INELEGIVEL", 403], ["OFFLINE", 403], ["VEICULO_DIVERGENTE", 403],
  ["VEICULO_INELEGIVEL", 403], ["CORRIDA_ATIVA", 409],
] as const)("diagnostica %s sem consultar ofertas nem mascarar como lista vazia", async (evento, status) => {
  if (evento === "PRESTADOR_INELEGIVEL") mocks.prestador.mockResolvedValue(null);
  if (evento === "OFFLINE") mocks.prestador.mockResolvedValue({ id: prestador, veiculoOnlineId: null, corridas: [] });
  if (evento === "VEICULO_INELEGIVEL") mocks.veiculo.mockResolvedValue(null);
  if (evento === "CORRIDA_ATIVA") mocks.prestador.mockResolvedValue({ id: prestador, veiculoOnlineId: veiculo, corridas: [{ id: corrida }] });
  const resposta = await GET(request(evento === "VEICULO_DIVERGENTE" ? "?veiculoId=" + usuario : ""));
  expect(resposta.status).toBe(status);
  expect(mocks.corridas).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", { evento });
});
it("falha de autenticação é 401, sem consultas de ofertas", async () => {
  mocks.autenticar.mockRejectedValue(new TokenInvalidoError());
  expect((await GET(request())).status).toBe(401);
  expect(mocks.prestador).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", { evento: "HTTP_401" });
});
it("veículo malformado é 400, sem consulta de banco", async () => {
  expect((await GET(request("?veiculoId=invalido"))).status).toBe(400);
  expect(mocks.prestador).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", { evento: "HTTP_400" });
});
it("erro interno não registra exceção bruta nem expõe seus dados", async () => {
  const erro = vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.corridas.mockRejectedValue(new Error("senha SQL +556599999999 origem privada"));
  const resposta = await GET(request());
  expect(resposta.status).toBe(500);
  expect(await resposta.json()).toEqual({ mensagem: "Não foi possível consultar corridas." });
  expect(erro).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", { evento: "HTTP_500" });
});
it("lista vazia com cursor indica paginação; nova consulta sem cursor não limita por data", async () => {
  mocks.corridas.mockResolvedValueOnce([]);
  const cursor = codificarCursor({ id: corrida, createdAt: data.toISOString() });
  expect(await (await GET(request("?cursor=" + cursor))).json()).toEqual({ corridas: [], proximoCursor: null });
  expect(mocks.corridas.mock.calls[0][0].where.AND[2]).toEqual({
    OR: [{ createdAt: { gt: data } }, { createdAt: data, id: { gt: corrida } }],
  });
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", {
    evento: "CONSULTA_CONCLUIDA", quantidade: 0, cursorInformado: true,
    veiculoInformado: false, temProximaPagina: false,
  });
  expect((await (await GET(request())).json()).corridas).toHaveLength(1);
  expect(mocks.corridas.mock.calls[1][0].where.AND[2]).toEqual({});
});
it("diagnóstico conta apenas itens devolvidos, sem incluir o item extra da paginação", async () => {
  mocks.corridas.mockResolvedValue([oferta, { ...oferta, id: usuario }]);
  const resposta = await (await GET(request("?limite=1"))).json();
  expect(resposta.corridas).toHaveLength(1);
  expect(resposta.proximoCursor).toBeTruthy();
  expect(console.info).toHaveBeenCalledWith("[ViaU:ofertas]", {
    evento: "CONSULTA_CONCLUIDA", quantidade: 1, cursorInformado: false,
    veiculoInformado: false, temProximaPagina: true,
  });
});
it.each([
  ["production", "development", "true"], ["development", "production", "true"],
  ["test", "development", "true"], ["development", "development", "false"],
  ["development", "", "true"],
])("diagnóstico desabilitado em %s/%s/%s", (node, ambiente, flag) => {
  vi.stubEnv("NODE_ENV", node); vi.stubEnv("VIAU_ENVIRONMENT", ambiente);
  vi.stubEnv("VIAU_DIAGNOSTICO_OFERTAS", flag);
  diagnosticarOfertas("OFFLINE");
  expect(console.info).not.toHaveBeenCalled();
});
