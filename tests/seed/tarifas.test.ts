import { expect, it } from "vitest";
import { tarifasSeed } from "../../scripts/seed/dados";
import { lerAutorizacoes } from "../../scripts/seed/tarifas";
import { calcularValorCorrida } from "@/modules/corrida/CalcularValorCorrida";

it.each([
  ["moto", "7.00", "21.00", "12.01"],
  ["economico", "10.00", "30.00", "17.51"],
  ["conforto", "15.00", "42.00", "24.52"],
  ["executivo", "20.00", "55.00", "32.52"],
] as const)("%s: mínima, partida+km e arredondamento decimal", (perfil, minima, dezKm, fracao) => {
  const t = tarifasSeed[perfil];
  const tarifa = { valorKm: Number(t.valorKm), tarifaMinima: Number(t.tarifaMinima), taxaPartida: Number(t.taxaPartida) };
  expect(calcularValorCorrida(1000, tarifa).valorTotal).toBe(minima);
  expect(calcularValorCorrida(10000, tarifa).valorTotal).toBe(dezKm);
  expect(calcularValorCorrida(5005, tarifa).valorTotal).toBe(fracao);
});
it.each(["true", "{}", "[{}]", '[{"id":"externo"}]'])("rejeita autorização genérica/incompleta: %s", entrada => {
  expect(() => lerAutorizacoes(entrada)).toThrow();
});
