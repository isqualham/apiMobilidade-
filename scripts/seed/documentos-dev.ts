import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { prepararDocumentosDev } from "./documentos";
import { SeedError, validarAmbienteSeed } from "./ambiente";
async function main() {
  validarAmbienteSeed(process.env);
  const banco = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try { console.log(JSON.stringify(await prepararDocumentosDev(banco, process.env))); }
  finally { await banco.$disconnect(); }
}
main().catch(erro => {
  console.error(erro instanceof SeedError ? erro.message : "Falha ao preparar documentos fictícios; nenhum documento existente foi sobrescrito.");
  process.exitCode = 1;
});
