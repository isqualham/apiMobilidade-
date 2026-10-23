import { NextResponse } from "next/server";
import { PrismaTermoUsoRepository } from "@/modules/termos-uso/PrismaTermoUsoRepository";
import { PrismaPoliticaPrivacidadeRepository } from "@/modules/politica-privacidade/PrismaPoliticaPrivacidadeRepository";

const termoUsoRepository = new PrismaTermoUsoRepository();
const politicaPrivacidadeRepository = new PrismaPoliticaPrivacidadeRepository();

export async function GET() {
  try {
    const [termosUso, politicaPrivacidade] = await Promise.all([
      termoUsoRepository.buscarVigente(),
      politicaPrivacidadeRepository.buscarVigente(),
    ]);

    if (!termosUso || !politicaPrivacidade) {
      return NextResponse.json(
        {
          erro: "Não foi possível encontrar os dois documentos ativos.",
          termosUso: termosUso ?? null,
          politicaPrivacidade: politicaPrivacidade ?? null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        termosUso,
        politicaPrivacidade,
      },
      { status: 200 },
    );
  } catch (erro: unknown) {
    console.error("Erro ao consultar documentos legais:", erro);

    return NextResponse.json(
      { erro: "Não foi possível consultar os documentos legais." },
      { status: 500 },
    );
  }
}
