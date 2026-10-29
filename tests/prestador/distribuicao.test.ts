import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaCategoriasDisponiveisRepository } from "@/modules/categoria-veiculo/PrismaCategoriasDisponiveisRepository";
import { PrismaSessaoRepository } from "@/modules/auth/PrismaSessaoRepository";
import { PrismaCorridaConsultaRepository } from "@/modules/corrida/PrismaCorridaConsultaRepository";
import { STATUS_ATIVOS } from "@/modules/corrida/ConsultaCorridaDTO";

const id = "00000000-0000-4000-8000-000000000001";
function setup() {
  const tx = {
    prestador: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id, veiculoOnlineId: id, corridas: [] }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    categoriaVeiculo: { findMany: vi.fn().mockResolvedValue([{ id, nome: "Moto" }]) },
    veiculo: { findFirst: vi.fn().mockResolvedValue({ categoriaVeiculoId: id }) },
    corrida: { findMany: vi.fn().mockResolvedValue([]) },
    refreshToken: { findUnique: vi.fn().mockResolvedValue({ sessaoId: id }) },
    sessaoAuth: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ usuarioId: id }),
    },
  };
  const banco = { $transaction: vi.fn(async callback => callback(tx)) };
  return { tx, banco, client: banco as unknown as PrismaClient };
}
it("categorias exigem Online, aprovação, conta ativa, tarifa e ausência de corrida nos dois papéis", async () => {
  const { tx, client, banco } = setup();
  expect(await new PrismaCategoriasDisponiveisRepository(client).listar(id)).toEqual([]);
  expect(tx.categoriaVeiculo.findMany).not.toHaveBeenCalled();
  expect(tx.prestador.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: {
      usuarioId: { not: id }, statusAprovacao: "APROVADO",
      usuario: { ativo: true, corridasComoPassageiro: { none: { status: { in: STATUS_ATIVOS } } } },
      corridas: { none: { status: { in: STATUS_ATIVOS } } },
      veiculoOnlineId: { not: null },
      veiculoOnline: { is: { ativo: true, statusAprovacao: "APROVADO",
        categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true }, tarifas: { some: { ativo: true } } } } },
    },
  }));
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
});
it("deduplica categorias e descarta seleção de veículo de outro prestador", async () => {
  const { tx, client } = setup();
  tx.prestador.findMany.mockResolvedValue([
    { id, veiculoOnline: { prestadorId: id, categoriaVeiculoId: id } },
    { id, veiculoOnline: { prestadorId: id, categoriaVeiculoId: id } },
    { id, veiculoOnline: { prestadorId: "outro", categoriaVeiculoId: "privada" } },
    { id, veiculoOnline: null },
  ]);
  await new PrismaCategoriasDisponiveisRepository(client).listar(id);
  expect(tx.categoriaVeiculo.findMany).toHaveBeenCalledWith({
    where: { id: { in: [id] } },
    select: { id: true, tipoVeiculoId: true, nome: true, descricao: true, ordemExibicao: true },
    orderBy: [{ ordemExibicao: "asc" }, { nome: "asc" }, { id: "asc" }],
  });
});
it("ofertas sem veiculoId usam somente o veículo Online próprio aprovado e a categoria exata", async () => {
  const { tx, client } = setup();
  await new PrismaCorridaConsultaRepository(client).disponiveis(id, { limite: 20 });
  expect(tx.veiculo.findFirst).toHaveBeenCalledWith({
    where: { id, prestadorId: id, ativo: true, statusAprovacao: "APROVADO", categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } },
    select: { categoriaVeiculoId: true },
  });
  expect(tx.corrida.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { AND: [
      { status: "SOLICITADA", prestadorId: null, passageiroId: { not: id }, passageiro: { ativo: true }, categoriaVeiculoId: id },
      { recusas: { none: { prestadorId: id } } }, {},
    ] },
  }));
});
it.each(["offline", "outroVeiculo", "ocupado", "naoAprovado", "veiculoInelegivel"])("ofertas não contornam %s", async caso => {
  const { tx, client } = setup();
  if (caso === "offline") tx.prestador.findFirst.mockResolvedValue({ id, veiculoOnlineId: null, corridas: [] });
  if (caso === "ocupado") tx.prestador.findFirst.mockResolvedValue({ id, veiculoOnlineId: id, corridas: [{ id }] });
  if (caso === "naoAprovado") tx.prestador.findFirst.mockResolvedValue(null);
  if (caso === "veiculoInelegivel") tx.veiculo.findFirst.mockResolvedValue(null);
  await expect(new PrismaCorridaConsultaRepository(client).disponiveis(id, {
    limite: 20, ...(caso === "outroVeiculo" ? { veiculoId: "outro" } : {}),
  })).rejects.toMatchObject({ statusCode: caso === "ocupado" ? 409 : 403 });
  expect(tx.corrida.findMany).not.toHaveBeenCalled();
});
it("logout revoga e coloca Offline atomicamente sem consultar ou alterar corridas", async () => {
  const { tx, client, banco } = setup();
  await new PrismaSessaoRepository(client).revogar("hash");
  expect(tx.prestador.updateMany).toHaveBeenCalledWith({
    where: { usuarioId: id, veiculoOnlineId: { not: null } },
    data: { veiculoOnlineId: null, disponibilidadeVersao: { increment: 1 } },
  });
  expect(tx.corrida.findMany).not.toHaveBeenCalled();
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted" });
});
it.each(["desconhecido", "revogado"])("logout %s não derruba uma nova disponibilidade de outra sessão", async caso => {
  const { tx, client } = setup();
  if (caso === "desconhecido") tx.refreshToken.findUnique.mockResolvedValue(null);
  else tx.sessaoAuth.updateMany.mockResolvedValue({ count: 0 });
  await new PrismaSessaoRepository(client).revogar("hash");
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it("falha ao atualizar disponibilidade propaga erro e impede confirmação do logout", async () => {
  const { tx, client } = setup();
  tx.prestador.updateMany.mockRejectedValue(new Error("falha"));
  await expect(new PrismaSessaoRepository(client).revogar("hash")).rejects.toThrow("falha");
});
it("logout de passageiro sem prestador conclui sem exigir cancelamento da corrida", async () => {
  const { tx, client } = setup();
  tx.prestador.updateMany.mockResolvedValue({ count: 0 });
  await expect(new PrismaSessaoRepository(client).revogar("hash")).resolves.toBeUndefined();
  expect(tx.sessaoAuth.updateMany).toHaveBeenCalled();
  expect(tx.corrida.findMany).not.toHaveBeenCalled();
});
