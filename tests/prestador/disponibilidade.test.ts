import { expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaDisponibilidadePrestadorRepository } from "@/modules/prestador/PrismaDisponibilidadePrestadorRepository";
import { DisponibilidadePrestadorUseCase } from "@/modules/prestador/DisponibilidadePrestadorUseCase";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
const id = "00000000-0000-4000-8000-000000000001";
function setup() {
  const prestador = { id, statusAprovacao: "APROVADO", veiculoOnlineId: null as string | null, disponibilidadeVersao: 0, veiculos: [{ categoriaVeiculoId: id }], corridas: [] };
  const tx = {
    prestador: { findFirst: vi.fn().mockResolvedValue(prestador), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    veiculo: { findFirst: vi.fn().mockResolvedValue({ id }) },
    corrida: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
  };
  const banco = { ...tx, $transaction: vi.fn(async callback => callback(tx)) };
  const repo = new PrismaDisponibilidadePrestadorRepository(banco as unknown as PrismaClient);
  return { prestador, tx, banco, repo, useCase: new DisponibilidadePrestadorUseCase(repo) };
}
it("consulta Offline e altera para Online usando versão e veículo elegível", async () => {
  const { repo, tx, banco } = setup();
  expect(await repo.consultar(id)).toEqual({ status: "OFFLINE", veiculoId: null, versao: 0 });
  expect(await repo.alterar(id, { status: "ONLINE", veiculoId: id, versao: 0 })).toEqual({ status: "ONLINE", veiculoId: id, versao: 1 });
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  expect(tx.veiculo.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, prestadorId: id, ativo: true, categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } } }));
  expect(tx.prestador.updateMany).toHaveBeenCalledWith({ where: { id, disponibilidadeVersao: 0 }, data: { veiculoOnlineId: id, disponibilidadeVersao: { increment: 1 } } });
});
it.each(["PENDENTE", "REJEITADO"])("recusa Online para %s", async status => {
  const { prestador, repo, tx } = setup(); prestador.statusAprovacao = status;
  await expect(repo.alterar(id, { status: "ONLINE", veiculoId: id, versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it("recusa veículo inelegível", async () => {
  const { repo, tx } = setup(); tx.veiculo.findFirst.mockResolvedValue(null);
  await expect(repo.alterar(id, { status: "ONLINE", veiculoId: id, versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
});
it("ausência de prestador impede leitura e escrita", async () => {
  const { repo, tx } = setup(); tx.prestador.findFirst.mockResolvedValue(null);
  await expect(repo.consultar(id)).rejects.toMatchObject({ statusCode: 403 });
  await expect(repo.alterar(id, { status: "OFFLINE", versao: 0 })).rejects.toMatchObject({ statusCode: 403 });
});
it("versão antiga não sobrescreve outra sessão", async () => {
  const { repo, tx } = setup();
  await expect(repo.alterar(id, { status: "OFFLINE", versao: 1 })).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it.each(["ONLINE", "OFFLINE"] as const)("corrida ativa impede alteração para %s", async status => {
  const { repo, tx } = setup(); tx.corrida.findFirst.mockResolvedValue({ id });
  await expect(repo.alterar(id, status === "ONLINE" ? { status, veiculoId: id, versao: 0 } : { status, versao: 0 })).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it("Offline remove seleção, sem exigir aprovação; repetição não incrementa versão", async () => {
  const { repo, tx, prestador } = setup();
  expect(await repo.alterar(id, { status: "OFFLINE", versao: 0 })).toEqual({ status: "OFFLINE", veiculoId: null, versao: 0 });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
  prestador.veiculoOnlineId = id; prestador.statusAprovacao = "REJEITADO";
  expect(await repo.alterar(id, { status: "OFFLINE", versao: 0 })).toEqual({ status: "OFFLINE", veiculoId: null, versao: 1 });
});
it("conflito compare-and-set retorna 409", async () => {
  const { repo, tx } = setup(); tx.prestador.updateMany.mockResolvedValue({ count: 0 });
  await expect(repo.alterar(id, { status: "ONLINE", veiculoId: id, versao: 0 })).rejects.toMatchObject({ statusCode: 409 });
});
it.each([new Prisma.PrismaClientKnownRequestError("conflito", { code: "P2034", clientVersion: "test" }),
  Object.assign(new Error("conflito"), { name: "DriverAdapterError", cause: { originalCode: "40001" } })])("conflito transacional vira 409", async erro => {
  const { repo, banco } = setup(); banco.$transaction.mockRejectedValue(erro);
  await expect(repo.alterar(id, { status: "OFFLINE", versao: 0 })).rejects.toMatchObject({ statusCode: 409 });
  await expect(new PrismaCorridaRepository(banco as unknown as PrismaClient).aceitar({ corridaId: id, usuarioId: id, veiculoId: id })).rejects.toMatchObject({ statusCode: 409 });
});
it.each([null, {}, { status: "ONLINE", versao: 0 }, { status: "OFFLINE", versao: -1 }, { status: "OFFLINE", versao: 0, usuarioId: id }, { status: "OFFLINE", versao: 0, veiculoId: id }])("valida contrato estrito %j", corpo => {
  const { useCase, tx } = setup();
  expect(() => useCase.alterar(id, corpo)).toThrow();
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it.each([null, "00000000-0000-4000-8000-000000000002"])("ofertas e aceite recusam Offline ou outro veículo (%s)", async selecionado => {
  const { banco, prestador } = setup(); prestador.veiculoOnlineId = selecionado;
  await expect(new PrismaCorridaConsultaRepository(banco as unknown as PrismaClient).disponiveis(id, { veiculoId: id, limite: 20 })).rejects.toMatchObject({ statusCode: 403 });
  await expect(new PrismaCorridaRepository(banco as unknown as PrismaClient).aceitar({ corridaId: id, usuarioId: id, veiculoId: id })).rejects.toMatchObject({ statusCode: 403 });
});
it("Online com veículo selecionado permite consulta", async () => {
  const { banco, prestador } = setup(); prestador.veiculoOnlineId = id;
  expect(await new PrismaCorridaConsultaRepository(banco as unknown as PrismaClient).disponiveis(id, { veiculoId: id, limite: 20 })).toEqual({ corridas: [], proximoCursor: null });
});
