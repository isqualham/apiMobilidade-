import { expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { swaggerSpec } from "@/lib/swagger";
import type { OpenAPIV3 } from "openapi-types";

it("o documento completo atende ao OpenAPI 3.0", async () => {
  const documento = await SwaggerParser.validate(structuredClone(swaggerSpec) as OpenAPIV3.Document);
  expect(documento).toHaveProperty("openapi", "3.0.0");
});

it("o contrato de solicitação não pede distância do cliente", () => {
  const documento = swaggerSpec as OpenAPIV3.Document;
  const entrada = documento.components?.schemas?.SolicitarCorrida as OpenAPIV3.SchemaObject;
  expect(entrada.required).not.toContain("distanciaKm");
  expect(entrada.properties).not.toHaveProperty("distanciaKm");
  expect(documento.paths["/api/corrida"]?.post?.responses).toHaveProperty("503");
});
