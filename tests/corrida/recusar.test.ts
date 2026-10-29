import { expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { PrismaRecusaOfertaRepository } from "@/modules/corrida/PrismaRecusaOfertaRepository";
import { RecusarOfertaUseCase } from "@/modules/corrida/RecusarOfertaUseCase";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
const id = "00000000-0000-4000-8000-000000000001";
function setup() {
  const data = new Date();
  const tx = {
    prestador: { findFirst: vi.fn().mockResolvedValue({ id, veiculoOnlineId: id, veiculos: [{ categoriaVeiculoId: id }], corridas: [] }) },
    veiculo: { findFirst: vi.fn().mockResolvedValue({ categoriaVeiculoId: id }) },
    corrida: { findFirst: vi.fn().mockImplementation(async args => args.where.id ? { status: "SOLICITADA", prestadorId: null } : null), findMany: vi.fn().mockResolvedValue([]) },
    recusaOferta: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ createdAt: data }) },
  };
  const banco = { $transaction: vi.fn(async callback => callback(tx)) };
  const repo = new PrismaRecusaOfertaRepository(banco as unknown as PrismaClient);
  return { tx, banco, repo, data };
}
it("registra recusa própria sem alterar corrida e usa transação Serializable", async () => {
  const { repo, tx, banco, data } = setup();
  expect(await repo.recusar({ usuarioId: id, corridaId: id })).toEqual({ corridaId: id, recusada: true, recusadaEm: data.toISOString() });
  expect(tx.recusaOferta.create).toHaveBeenCalledWith({ data: { prestadorId: id, corridaId: id } });
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});
it("repetição retorna registro original mesmo Offline sem duplicar", async () => {
  const { repo, tx, data } = setup();
  tx.prestador.findFirst.mockResolvedValue({ id, veiculoOnlineId: null });
  tx.recusaOferta.findUnique.mockResolvedValue({ createdAt: data });
  expect((await repo.recusar({ usuarioId: id, corridaId: id })).recusadaEm).toBe(data.toISOString());
  expect(tx.recusaOferta.create).not.toHaveBeenCalled();
  expect(tx.corrida.findFirst).not.toHaveBeenCalled();
});
it.each(["semPrestador", "offline", "veiculo", "ocupado", "inexistente", "aceita"])("recusa inválida não grava: %s", async caso => {
  const { repo, tx } = setup();
  let status = 403;
  if (caso === "semPrestador") tx.prestador.findFirst.mockResolvedValue(null);
  if (caso === "offline") tx.prestador.findFirst.mockResolvedValue({ id, veiculoOnlineId: null });
  if (caso === "veiculo") tx.veiculo.findFirst.mockResolvedValue(null);
  if (caso === "ocupado") { tx.corrida.findFirst.mockResolvedValue({ id }); status = 409; }
  if (caso === "inexistente") { tx.corrida.findFirst.mockResolvedValue(null); status = 404; }
  if (caso === "aceita") { tx.corrida.findFirst.mockImplementation(async args => args.where.id ? { status: "ACEITA", prestadorId: id } : null); status = 409; }
  await expect(repo.recusar({ usuarioId: id, corridaId: id })).rejects.toMatchObject({ statusCode: status });
  expect(tx.recusaOferta.create).not.toHaveBeenCalled();
});
it("consulta exclui recusas somente do prestador e aceite direto é bloqueado", async () => {
  const { banco, tx, data } = setup();
  await new PrismaCorridaConsultaRepository(banco as unknown as PrismaClient).disponiveis(id, { veiculoId: id, limite: 20 });
  expect(tx.corrida.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: expect.arrayContaining([{ recusas: { none: { prestadorId: id } } }]) } }));
  tx.recusaOferta.findUnique.mockResolvedValue({ createdAt: data });
  await expect(new PrismaCorridaRepository(banco as unknown as PrismaClient).aceitar({ usuarioId: id, corridaId: id, veiculoId: id })).rejects.toMatchObject({ statusCode: 409 });
});
it.each(["P2002", "P2034"])("conflito %s tem retentativas limitadas", async code => {
  const { banco, repo } = setup();
  banco.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflito", { code, clientVersion: "test" }));
  await expect(repo.recusar({ usuarioId: id, corridaId: id })).rejects.toMatchObject({ statusCode: 409 });
  expect(banco.$transaction).toHaveBeenCalledTimes(3);
});
it("recusa não aceita identidade ou veículo fornecidos no corpo", () => {
  const { repo } = setup(); const useCase = new RecusarOfertaUseCase(repo);
  expect(() => useCase.executar({ usuarioId: id, corridaId: id }, { prestadorId: id })).toThrow();
  expect(() => useCase.executar({ usuarioId: id, corridaId: "invalido" })).toThrow();
});
