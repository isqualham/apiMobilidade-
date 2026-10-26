import { Prisma } from "@/generated/prisma/client";
import { CorridaError } from "./CorridaDTO";
import type { TarifaCategoria } from "@/modules/tarifa/TarifaCategoriaRepository";

const LIMITE_MONETARIO = new Prisma.Decimal("99999999.99");

export function calcularValorCorrida(
  distanciaMetros: number,
  tarifa: Pick<TarifaCategoria, "valorKm" | "tarifaMinima" | "taxaPartida">,
): { distanciaKm: string; valorKmAplicado: string; valorTotal: string } {
  // Metros inteiros mantêm a precisão de Decimal(10,3) em quilômetros.
  if (
    !Number.isSafeInteger(distanciaMetros) ||
    distanciaMetros <= 0 ||
    distanciaMetros > 9999999999
  ) {
    throw new CorridaError("O serviço de rotas retornou uma distância inválida.", 502);
  }

  const valores = [tarifa.valorKm, tarifa.tarifaMinima, tarifa.taxaPartida];
  if (valores.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
    throw new CorridaError("Tarifa inválida para cálculo da corrida.", 422);
  }
  // A conversão pela representação decimal evita multiplicar floats monetários.
  const [valorKm, minima, partida] = valores.map(
    (v) => new Prisma.Decimal(String(v)),
  );
  if (
    [valorKm, minima, partida].some(
      (v) => v.isNegative() || v.gt(LIMITE_MONETARIO) || v.decimalPlaces() > 2,
    ) ||
    valorKm.isZero() ||
    minima.isZero()
  ) {
    throw new CorridaError("Tarifa inválida para cálculo da corrida.", 422);
  }

  const distanciaKm = new Prisma.Decimal(distanciaMetros).div(1000);
  const calculado = partida.plus(distanciaKm.times(valorKm));
  const total = Prisma.Decimal.max(minima, calculado);
  // Rejeitar também excesso antes do arredondamento, sem truncar ou saturar.
  if (total.gt(LIMITE_MONETARIO)) {
    throw new CorridaError("O valor da corrida excede o limite permitido.", 422);
  }
  return {
    distanciaKm: distanciaKm.toFixed(3),
    valorKmAplicado: valorKm.toFixed(2),
    valorTotal: total.toFixed(2, Prisma.Decimal.ROUND_HALF_UP),
  };
}
