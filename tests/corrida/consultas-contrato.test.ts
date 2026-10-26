import { expect, it } from "vitest";
import { getSortedRoutes } from "next/dist/shared/lib/router/utils/sorted-routes";
import { swaggerSpec } from "@/lib/swagger";
import type { OpenAPIV3 } from "openapi-types";

it("rotas estáticas têm precedência sobre detalhes e preservam aceite", () => {
  expect(getSortedRoutes(["/api/corrida/[id]", "/api/corrida/disponiveis", "/api/corrida/ativa", "/api/corrida", "/api/corrida/[id]/aceitar"])).toEqual([
    "/api/corrida", "/api/corrida/ativa", "/api/corrida/disponiveis", "/api/corrida/[id]", "/api/corrida/[id]/aceitar",
  ]);
});
it("OpenAPI contém as quatro leituras autenticadas e preserva o POST", () => {
  const spec = swaggerSpec as OpenAPIV3.Document;
  for (const path of ["/api/corrida", "/api/corrida/ativa", "/api/corrida/disponiveis", "/api/corrida/{id}"]) {
    expect(spec.paths[path]?.get?.security).toEqual([{ bearerAuth: [] }]);
  }
  expect(spec.paths["/api/corrida"]?.post).toBeDefined();
});
