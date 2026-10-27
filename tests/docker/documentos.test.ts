import { expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { prepararDocumentosDev } from "../../scripts/seed/documentos";
const env = { NODE_ENV: "development", VIAU_ENVIRONMENT: "development", VIAU_SEED_CONFIRM: "desenvolvimento", DATABASE_URL: "postgresql://unused:unused@db/mobilidade_db" };
function mockBanco() {
  const termoUso = { findFirst: vi.fn(), create: vi.fn() };
  const politicaPrivacidade = { findFirst: vi.fn(), create: vi.fn() };
  const banco = { $transaction: vi.fn(async callback => callback({ termoUso, politicaPrivacidade })) };
  return { banco: banco as unknown as PrismaClient, termoUso, politicaPrivacidade };
}
it("documentos ativos são preservados integralmente", async () => {
  const { banco, termoUso, politicaPrivacidade } = mockBanco();
  termoUso.findFirst.mockResolvedValue({ id: "existente" }); politicaPrivacidade.findFirst.mockResolvedValue({ id: "existente" });
  expect(await prepararDocumentosDev(banco, env)).toEqual({ documentosFicticiosCriados: 0 });
  expect(termoUso.create).not.toHaveBeenCalled(); expect(politicaPrivacidade.create).not.toHaveBeenCalled();
});
it("documentos ausentes usam textos do Swagger e IDs estáveis", async () => {
  const { banco, termoUso, politicaPrivacidade } = mockBanco();
  expect(await prepararDocumentosDev(banco, env)).toEqual({ documentosFicticiosCriados: 2 });
  for (const repo of [termoUso, politicaPrivacidade]) {
    expect(repo.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      id: expect.stringMatching(/^b12a0000-/), versao: "1.0", conteudo: repo === termoUso ? "Termos e condições de uso do ViaU." : "Política de privacidade do ViaU.", ativo: true,
    }) });
  }
});
it("não reativa documento reservado inativo", async () => {
  const { banco, termoUso } = mockBanco();
  termoUso.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "reservado" });
  await expect(prepararDocumentosDev(banco, env)).rejects.toThrow("não será sobrescrito");
  expect(termoUso.create).not.toHaveBeenCalled();
});
it("bloqueia produção antes da transação", async () => {
  const { banco } = mockBanco();
  await expect(prepararDocumentosDev(banco, { ...env, NODE_ENV: "production" })).rejects.toThrow();
  expect(banco.$transaction).not.toHaveBeenCalled();
});
