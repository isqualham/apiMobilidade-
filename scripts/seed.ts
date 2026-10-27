import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { executarSeed } from "./seed/executar";
import { SeedError, validarAmbienteSeed } from "./seed/ambiente";

async function main() {
  const destino = validarAmbienteSeed(process.env);
  const banco = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const resultado = await executarSeed(banco, {
      env: process.env, senha: process.env.VIAU_SEED_PASSWORD ?? "teste1234",
      categorias: { moto: process.env.VIAU_SEED_MOTO_ID || undefined, economico: process.env.VIAU_SEED_ECONOMICO_ID || undefined, conforto: process.env.VIAU_SEED_CONFORTO_ID || undefined, executivo: process.env.VIAU_SEED_EXECUTIVO_ID || undefined },
    });
    console.log(JSON.stringify({ destino, ...resultado }, null, 2));
  } finally { await banco.$disconnect(); }
}
main().catch(erro => {
  console.error(erro instanceof SeedError ? erro.message : "Seed interrompida. Confira configuração e migrations; credenciais não serão exibidas.");
  process.exitCode = 1;
});
