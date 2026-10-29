import { beforeEach, expect, it, vi } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { swaggerSpec } from "@/lib/swagger";
const mocks = vi.hoisted(() => ({ autenticar: vi.fn(), listar: vi.fn() }));
vi.mock("@/modules/auth/AutenticarRequisicao", async importOriginal => {
  const original = await importOriginal<typeof import("@/modules/auth/AutenticarRequisicao")>();
  return { ...original, autenticarRequisicao: mocks.autenticar };
});
vi.mock("@/modules/categoria-veiculo/PrismaCategoriasDisponiveisRepository", () => ({
  PrismaCategoriasDisponiveisRepository: class { listar = mocks.listar; },
}));
import { GET } from "@/app/api/categorias-veiculo/disponiveis/route";
import { TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.autenticar.mockResolvedValue({ id: "identidade-autenticada" });
  mocks.listar.mockResolvedValue([]);
});
it("usa identidade autenticada, retorna lista vazia e impede cache", async () => {
  const resposta = await GET(new Request("http://localhost/api/categorias-veiculo/disponiveis?usuarioId=terceiro"));
  expect(resposta.status).toBe(200);
  expect(await resposta.json()).toEqual({ categorias: [] });
  expect(resposta.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.listar).toHaveBeenCalledWith("identidade-autenticada");
});
it("falha de autenticação retorna 401 antes de consultar disponibilidade", async () => {
  mocks.autenticar.mockRejectedValue(new TokenInvalidoError());
  const resposta = await GET(new Request("http://localhost/api/categorias-veiculo/disponiveis"));
  expect(resposta.status).toBe(401);
  expect(mocks.listar).not.toHaveBeenCalled();
});
it("erro interno não expõe detalhes do banco", async () => {
  mocks.listar.mockRejectedValue(new Error("credencial privada"));
  const resposta = await GET(new Request("http://localhost/api/categorias-veiculo/disponiveis"));
  expect(resposta.status).toBe(500);
  expect(JSON.stringify(await resposta.json())).not.toContain("credencial");
});
it("Swagger documenta autenticação e veículo opcional nas ofertas", () => {
  const spec = swaggerSpec as OpenAPIV3.Document;
  expect(spec.paths["/api/categorias-veiculo/disponiveis"]?.get?.security).toEqual([{ bearerAuth: [] }]);
  const parametro = spec.paths["/api/corrida/disponiveis"]?.get?.parameters?.find(p => "name" in p && p.name === "veiculoId") as OpenAPIV3.ParameterObject;
  expect(parametro.required).toBe(false);
});
