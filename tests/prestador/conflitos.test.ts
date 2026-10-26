import { expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPrestadorRepository } from "@/modules/prestador/PrismaPrestadorRepository";

const dados = {
  prestadorId: "00000000-0000-4000-8000-000000000001",
  administradorId: "00000000-0000-4000-8000-000000000002",
  statusAprovacao: "APROVADO" as const,
};
it.each(["P2034", "P2025"])("converte %s em conflito sem repetir decisão", async (code) => {
  const $transaction = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("erro", { code, clientVersion: "test" }));
  const repository = new PrismaPrestadorRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.decidirAprovacao(dados)).rejects.toMatchObject({ statusCode: 409 });
  expect($transaction).toHaveBeenCalledTimes(1);
});
it("preserva falhas inesperadas para tratamento HTTP 500", async () => {
  const $transaction = vi.fn().mockRejectedValue(new Error("falha de conexão"));
  const repository = new PrismaPrestadorRepository({ $transaction } as unknown as PrismaClient);
  await expect(repository.decidirAprovacao(dados)).rejects.toThrow("falha de conexão");
});
