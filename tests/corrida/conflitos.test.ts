import { expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaCorridaRepository } from "@/modules/corrida/PrismaCorridaRepository";
import type { CriarCorridaRepositoryDTO } from "@/modules/corrida/CorridaRepository";

it("limita a três tentativas e converte P2034 persistente em 409", async () => {
  const $transaction = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflito", { code: "P2034", clientVersion: "test" }));
  const repository = new PrismaCorridaRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.criar({} as CriarCorridaRepositoryDTO)).rejects.toMatchObject({ statusCode: 409 });
  expect($transaction).toHaveBeenCalledTimes(3);
  expect($transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
});

it("não repete erros que não são de serialização", async () => {
  const $transaction = vi.fn().mockRejectedValue(new Error("indisponível"));
  const repository = new PrismaCorridaRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.criar({} as CriarCorridaRepositoryDTO)).rejects.toThrow("indisponível");
  expect($transaction).toHaveBeenCalledTimes(1);
});

it.each(["40001", "40P01"])("repete conflito do adapter no commit (%s) e retorna 409 se persistir", async (originalCode) => {
  const erro = Object.assign(new Error("TransactionWriteConflict"), {
    name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict", originalCode },
  });
  const $transaction = vi.fn().mockRejectedValue(erro);
  const repository = new PrismaCorridaRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.criar({} as CriarCorridaRepositoryDTO)).rejects.toMatchObject({ statusCode: 409 });
  expect($transaction).toHaveBeenCalledTimes(3);
});

it("não repete erro de conexão do adapter como conflito de commit", async () => {
  const erro = Object.assign(new Error("ConnectionClosed"), {
    name: "DriverAdapterError", cause: { kind: "ConnectionClosed", originalCode: "08006" },
  });
  const $transaction = vi.fn().mockRejectedValue(erro);
  const repository = new PrismaCorridaRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.criar({} as CriarCorridaRepositoryDTO)).rejects.toBe(erro);
  expect($transaction).toHaveBeenCalledTimes(1);
});
