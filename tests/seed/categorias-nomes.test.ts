import { expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { categoriasSeed, idSeed, tarifasSeed } from "../../scripts/seed/dados";
import { resolverCategorias } from "../../scripts/seed/categorias";

const finais = ["Moto", "Carro Econômico", "Carro Premium", "Carro Porta-Malas Grande"];
function setup(nomes: string[]) {
  const registros = categoriasSeed.map((c, i) => ({
    id: c.id, nome: nomes[i], ativo: c.ativo, descricao: "Descrição preservada",
    tipoVeiculoId: idSeed(c.papel === "moto" ? 51 : 52),
    tipoVeiculo: { nome: c.tipo, ativo: true },
  }));
  const tx = {
    categoriaVeiculo: {
      findMany: vi.fn(async () => registros),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { nome: string } }) => {
        const registro = registros.find(c => c.id === where.id)!;
        registro.nome = data.nome;
        return registro;
      }),
      create: vi.fn(), findUnique: vi.fn(),
    },
    tipoVeiculo: { findMany: vi.fn(), create: vi.fn() },
  };
  return { registros, tx, banco: tx as unknown as Prisma.TransactionClient };
}
it("mantém os quatro perfis/IDs, tarifas e tipos existentes", () => {
  expect(categoriasSeed.map(c => c.nome)).toEqual(finais);
  expect(categoriasSeed.map(c => [c.papel, c.id, c.tipo, c.ativo])).toEqual([
    ["moto", idSeed(41), "Moto", true],
    ["economico", idSeed(42), "Carro", true],
    ["conforto", idSeed(43), "Carro", false],
    ["executivo", idSeed(44), "Carro", false],
  ]);
  expect(tarifasSeed.conforto).toEqual({ id: idSeed(33), valorKm: "3.50", tarifaMinima: "15.00", taxaPartida: "7.00" });
  expect(tarifasSeed.executivo).toEqual({ id: idSeed(34), valorKm: "4.50", tarifaMinima: "20.00", taxaPartida: "10.00" });
});
it("renomeia apenas nome, preserva IDs/estado/tipo e é idempotente", async () => {
  const { registros, tx, banco } = setup(["ViaU Moto", "ViaU Econômico", "ViaU Conforto", "ViaU Executivo"]);
  const antes = structuredClone(registros);
  const resultado = await resolverCategorias(banco, {});
  expect(resultado.ids).toEqual({ moto: idSeed(41), economico: idSeed(42), conforto: idSeed(43), executivo: idSeed(44) });
  expect(registros).toEqual(antes.map((r, i) => ({ ...r, nome: finais[i] })));
  expect(tx.categoriaVeiculo.update.mock.calls).toEqual(categoriasSeed.map(c => [{ where: { id: c.id }, data: { nome: c.nome } }]));
  tx.categoriaVeiculo.update.mockClear();
  expect((await resolverCategorias(banco, {})).resumo.every(c => c.acao === "preservada")).toBe(true);
  expect(tx.categoriaVeiculo.update).not.toHaveBeenCalled();
  expect(tx.categoriaVeiculo.create).not.toHaveBeenCalled();
  expect(tx.tipoVeiculo.findMany).not.toHaveBeenCalled();
});
it.each(categoriasSeed.flatMap((c, indice) => c.aliases.map(alias => ({ indice, alias }))))(
  "reutiliza alias $alias sem criar categoria", async ({ indice, alias }) => {
    const nomes = [...finais]; nomes[indice] = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const { banco, tx, registros } = setup(nomes);
    await resolverCategorias(banco, {});
    expect(registros[indice].nome).toBe(finais[indice]);
    expect(tx.categoriaVeiculo.create).not.toHaveBeenCalled();
  },
);
it.each(categoriasSeed.map((c, indice) => ({ indice, alias: c.aliases[0] })))(
  "não funde nem duplica categoria com alias e nome final coexistentes: $alias",
  async ({ indice, alias }) => {
    const { banco, registros, tx } = setup(finais);
    registros.push({ ...registros[indice], id: idSeed(90), nome: alias });
    await expect(resolverCategorias(banco, {})).rejects.toThrow("ambíguas");
    expect(tx.categoriaVeiculo.create).not.toHaveBeenCalled();
  },
);
