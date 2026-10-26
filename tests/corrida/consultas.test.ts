import { expect, it, vi } from "vitest";
import { ConsultarCorridasUseCase } from "@/modules/corrida/ConsultarCorridasUseCase";
import { codificarCursor } from "@/modules/corrida/ConsultaCorridaDTO";

const id = "00000000-0000-4000-8000-000000000001";
function dependencias() {
  const repo = { disponiveis: vi.fn(), ativa: vi.fn(), detalhe: vi.fn(), historico: vi.fn() };
  return { repo, useCase: new ConsultarCorridasUseCase(repo) };
}
it.each(["limite=0", "limite=51", "limite=1.2", "limite=-1", "limite=abc", "limite=1&limite=2", "usuarioId=" + id, "papel=admin", "status=SOLICITADA", "cursor=???", "cursor=" + Buffer.from('{}').toString('base64url')])("rejeita filtro inválido %s sem consultar banco", (query) => {
  const { repo, useCase } = dependencias();
  expect(() => useCase.historico(id, new URLSearchParams(query))).toThrow();
  expect(repo.historico).not.toHaveBeenCalled();
});
it("decodifica cursor e limita paginação", () => {
  const { repo, useCase } = dependencias();
  const cursor = { id, createdAt: "2026-01-01T00:00:00.000Z" };
  useCase.historico(id, new URLSearchParams({ cursor: codificarCursor(cursor), limite: "5", papel: "passageiro", status: "FINALIZADA" }));
  expect(repo.historico).toHaveBeenCalledWith(id, { cursor, limite: 5, papel: "passageiro", status: "FINALIZADA" });
});
it("usa defaults e exige veículo para ofertas", () => {
  const { repo, useCase } = dependencias();
  useCase.historico(id, new URLSearchParams());
  expect(repo.historico).toHaveBeenCalledWith(id, { limite: 20, papel: "todos" });
  expect(() => useCase.disponiveis(id, new URLSearchParams())).toThrow();
  useCase.disponiveis(id, new URLSearchParams({ veiculoId: id }));
  expect(repo.disponiveis).toHaveBeenCalledWith(id, { limite: 20, veiculoId: id });
});
it("detalhe inexistente ou de terceiro recebe 404", async () => {
  const { repo, useCase } = dependencias();
  repo.detalhe.mockResolvedValue(null);
  await expect(useCase.detalhe(id, id, new URLSearchParams())).rejects.toMatchObject({ statusCode: 404 });
});
it("detalhes não aceitam filtros de identidade e UUID inválido", async () => {
  const { repo, useCase } = dependencias();
  await expect(useCase.detalhe(id, id, new URLSearchParams({ usuarioId: id }))).rejects.toMatchObject({ statusCode: 400 });
  await expect(useCase.detalhe(id, "invalido", new URLSearchParams())).rejects.toMatchObject({ statusCode: 400 });
  expect(repo.detalhe).not.toHaveBeenCalled();
});
it("ativa mantém identidade e papel validado", () => {
  const { repo, useCase } = dependencias();
  useCase.ativa(id, new URLSearchParams({ papel: "prestador" }));
  expect(repo.ativa).toHaveBeenCalledWith(id, "prestador");
  expect(() => useCase.ativa(id, new URLSearchParams({ prestadorId: id }))).toThrow();
});
