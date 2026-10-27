import { Prisma } from "@/generated/prisma/client";
export function conflitoDisponibilidade(erro: unknown): boolean {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2003", "P2025"].includes(erro.code)) return true;
  if (!(erro instanceof Error) || erro.name !== "DriverAdapterError") return false;
  const causa = erro.cause as { originalCode?: string } | undefined;
  return causa?.originalCode === "40001" || causa?.originalCode === "40P01";
}
