import { expect, it, vi } from "vitest";
import { AtualizarAprovacaoPrestadorUseCase } from "@/modules/prestador/AtualizarAprovacaoPrestadorUseCase";

const id = "00000000-0000-4000-8000-000000000001";
const admin = "00000000-0000-4000-8000-000000000002";

it.each(["APROVADO", "REJEITADO"])("encaminha decisão %s validada", async (statusAprovacao) => {
  const decidirAprovacao = vi.fn().mockResolvedValue({ id, statusAprovacao });
  const useCase = new AtualizarAprovacaoPrestadorUseCase({ decidirAprovacao });
  await useCase.executar(id, admin, { statusAprovacao });
  expect(decidirAprovacao).toHaveBeenCalledWith({ prestadorId: id, administradorId: admin, statusAprovacao });
});

it.each([null, [], {}, "APROVADO", { statusAprovacao: "PENDENTE" }, { statusAprovacao: "aprovado" },
  { statusAprovacao: true }, { statusAprovacao: "APROVADO", administrador: true },
  { statusAprovacao: "APROVADO", administradorId: admin },
  { statusAprovacao: "APROVADO", usuarioId: id },
])("rejeita corpo inválido ou atributos extras %j", async (corpo) => {
  const decidirAprovacao = vi.fn();
  await expect(new AtualizarAprovacaoPrestadorUseCase({ decidirAprovacao }).executar(id, admin, corpo)).rejects.toMatchObject({ statusCode: 400 });
  expect(decidirAprovacao).not.toHaveBeenCalled();
});

it.each([["invalido", admin], [id, "invalido"]])("rejeita identificadores inválidos", async (prestadorId, administradorId) => {
  const decidirAprovacao = vi.fn();
  await expect(new AtualizarAprovacaoPrestadorUseCase({ decidirAprovacao }).executar(prestadorId, administradorId, { statusAprovacao: "APROVADO" })).rejects.toMatchObject({ statusCode: 400 });
  expect(decidirAprovacao).not.toHaveBeenCalled();
});
