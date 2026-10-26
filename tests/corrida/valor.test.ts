import { describe, expect, it } from "vitest";
import { calcularValorCorrida } from "@/modules/corrida/CalcularValorCorrida";

describe("Cálculo monetário da solicitação", () => {
  it("arredonda 1.005 para 1.01 sem erro binário", () => {
    expect(calcularValorCorrida(1005, { valorKm: 1, tarifaMinima: 0.01, taxaPartida: 0 }).valorTotal).toBe("1.01");
  });
  it("aplica mínimo e taxa de partida", () => {
    expect(calcularValorCorrida(100, { valorKm: 2.5, tarifaMinima: 8, taxaPartida: 3 }).valorTotal).toBe("8.00");
    expect(calcularValorCorrida(8500, { valorKm: 2.5, tarifaMinima: 8, taxaPartida: 3 }).valorTotal).toBe("24.25");
  });
  it("aceita o limite exato Decimal(10,2)", () => {
    expect(calcularValorCorrida(1000, { valorKm: 99999999.99, tarifaMinima: 1, taxaPartida: 0 }).valorTotal).toBe("99999999.99");
  });
  it("rejeita excesso por multiplicação", () => {
    expect(() => calcularValorCorrida(2000, { valorKm: 99999999.99, tarifaMinima: 1, taxaPartida: 0 })).toThrow("excede");
  });
  it("rejeita excesso por soma mesmo antes do arredondamento", () => {
    expect(() => calcularValorCorrida(1, { valorKm: 0.01, tarifaMinima: 1, taxaPartida: 99999999.99 })).toThrow("excede");
  });
  it.each([0, -1, NaN, Infinity, 0.1, 10000000000])("rejeita distância inválida %s do provedor", (metros) => {
    expect(() => calcularValorCorrida(metros, { valorKm: 1, tarifaMinima: 1, taxaPartida: 0 })).toThrow("distância inválida");
  });
  it.each([NaN, Infinity, -1, 0, 1.001, 100000000])("rejeita tarifa inválida %s", (valorKm) => {
    expect(() => calcularValorCorrida(1000, { valorKm, tarifaMinima: 1, taxaPartida: 0 })).toThrow("Tarifa inválida");
  });
});
