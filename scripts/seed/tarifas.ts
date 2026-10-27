import { Prisma } from "@/generated/prisma/client";
import { calcularValorCorrida } from "@/modules/corrida/CalcularValorCorrida";
import { tarifasSeed, type PerfilCategoria } from "./dados";
import { SeedError } from "./ambiente";

export interface AutorizacaoTarifa {
  id: string; categoriaVeiculoId: string; updatedAt: string;
  valorKm: string; tarifaMinima: string; taxaPartida: string;
}
export function lerAutorizacoes(valor?: string): AutorizacaoTarifa[] {
  if (!valor) return [];
  try {
    const dados: unknown = JSON.parse(valor);
    if (!Array.isArray(dados)) throw new Error();
    const campos = ["id", "categoriaVeiculoId", "updatedAt", "valorKm", "tarifaMinima", "taxaPartida"];
    const ids = new Set<string>();
    for (const item of dados) {
      if (!item || typeof item !== "object" || Object.keys(item).length !== campos.length || campos.some(c => typeof item[c] !== "string")) throw new Error();
      if (!Object.values(tarifasSeed).some(t => t.id === item.id) || ids.has(item.id)) throw new Error();
      if (!/^[0-9a-f-]{36}$/i.test(item.categoriaVeiculoId) || !Number.isFinite(Date.parse(item.updatedAt))) throw new Error();
      for (const campo of ["valorKm", "tarifaMinima", "taxaPartida"]) if (!/^\d{1,8}\.\d{2}$/.test(item[campo])) throw new Error();
      ids.add(item.id);
    }
    return dados as AutorizacaoTarifa[];
  } catch { throw new SeedError("Autorização de tarifas inválida: informe IDs reservados e o snapshot completo atual, sem campos extras."); }
}

export async function prepararTarifa(tx: Prisma.TransactionClient, papel: PerfilCategoria, categoriaVeiculoId: string, autorizacoes: AutorizacaoTarifa[]) {
  const alvo = tarifasSeed[papel];
  const valores = { valorKm: alvo.valorKm, tarifaMinima: alvo.tarifaMinima, taxaPartida: alvo.taxaPartida };
  // Reutiliza a validação/cálculo existentes; persistência e comparação permanecem decimais.
  calcularValorCorrida(1000, { valorKm: Number(alvo.valorKm), tarifaMinima: Number(alvo.tarifaMinima), taxaPartida: Number(alvo.taxaPartida) });
  let tarifa = await tx.tarifaCategoria.findUnique({ where: { categoriaVeiculoId } });
  let acao = "preservada";
  const autorizacao = autorizacoes.find(a => a.id === alvo.id);
  if (autorizacao && (autorizacao.categoriaVeiculoId !== categoriaVeiculoId || tarifa?.id !== alvo.id)) throw new SeedError("Autorização não corresponde à tarifa e categoria reservadas da seed.");
  if (!tarifa) {
    if (await tx.tarifaCategoria.findUnique({ where: { id: alvo.id } })) throw new SeedError("ID reservado de tarifa já pertence a outra categoria.");
    tarifa = await tx.tarifaCategoria.create({ data: { id: alvo.id, categoriaVeiculoId, ...valores, ativo: true } });
    acao = "criada";
  } else {
    if (!tarifa.ativo) throw new SeedError("Tarifa existente inativa; a seed não reativa tarifas.");
    calcularValorCorrida(1000, { valorKm: Number(tarifa.valorKm), tarifaMinima: Number(tarifa.tarifaMinima), taxaPartida: Number(tarifa.taxaPartida) });
    const igual = tarifa.valorKm.eq(alvo.valorKm) && tarifa.tarifaMinima.eq(alvo.tarifaMinima) && tarifa.taxaPartida.eq(alvo.taxaPartida);
    if (!igual && autorizacao) {
      const resultado = await tx.tarifaCategoria.updateMany({ where: {
        id: alvo.id, categoriaVeiculoId, ativo: true, updatedAt: new Date(autorizacao.updatedAt),
        valorKm: new Prisma.Decimal(autorizacao.valorKm), tarifaMinima: new Prisma.Decimal(autorizacao.tarifaMinima), taxaPartida: new Prisma.Decimal(autorizacao.taxaPartida),
      }, data: valores });
      if (resultado.count !== 1) throw new SeedError("Tarifa mudou desde a revisão; atualização cancelada. Confira um novo snapshot.");
      tarifa = await tx.tarifaCategoria.findUniqueOrThrow({ where: { id: alvo.id } });
      acao = "atualizada";
    }
  }
  return {
    id: tarifa.id, categoriaId: categoriaVeiculoId, acao, preservada: acao === "preservada",
    valorKm: tarifa.valorKm.toFixed(2), tarifaMinima: tarifa.tarifaMinima.toFixed(2), taxaPartida: tarifa.taxaPartida.toFixed(2), updatedAt: tarifa.updatedAt.toISOString(),
    valoresPropostos: valores,
  };
}
