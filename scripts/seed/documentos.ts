import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { SeedError, validarAmbienteSeed } from "./ambiente";

// Textos simplificados dos exemplos POST em src/docs/swagger/termos-uso.ts
// e src/docs/swagger/politica-privacidade.ts. Uso exclusivo em desenvolvimento.
export const documentosSeed = [
  { tipo: "termoUso", id: "b12a0000-0000-4000-8000-000000000061", conteudo: "Termos e condições de uso do ViaU." },
  { tipo: "politicaPrivacidade", id: "b12a0000-0000-4000-8000-000000000062", conteudo: "Política de privacidade do ViaU." },
] as const;

export async function prepararDocumentosNaTransacao(tx: Prisma.TransactionClient, env: Record<string, string | undefined>) {
  validarAmbienteSeed(env);
  let criados = 0;
  for (const { tipo, id, conteudo } of documentosSeed) {
    const repository = {
      findFirst: (args: { where: { ativo?: boolean } }) => tipo === "termoUso" ? tx.termoUso.findFirst(args) : tx.politicaPrivacidade.findFirst(args),
      create: (args: { data: { id: string; versao: string; ativo: boolean; conteudo: string } }) => tipo === "termoUso" ? tx.termoUso.create(args) : tx.politicaPrivacidade.create(args),
    };
    if (await repository.findFirst({ where: { ativo: true } })) continue;
    if (await repository.findFirst({ where: {} })) {
      throw new SeedError("Documento existente inativo: revise manualmente; não será sobrescrito ou reativado.");
    }
    await repository.create({ data: { id, versao: "1.0", ativo: true, conteudo } });
    criados++;
  }
  return { documentosFicticiosCriados: criados };
}

// Entrada manual independente preservada; o fluxo completo reutiliza a transação externa.
export async function prepararDocumentosDev(banco: PrismaClient, env: Record<string, string | undefined>) {
  validarAmbienteSeed(env);
  return banco.$transaction(tx => prepararDocumentosNaTransacao(tx, env), { isolationLevel: "Serializable" });
}
