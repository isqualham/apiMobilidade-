import { NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const enviarCodigoSchema = z.object({
  telefone: z
    .string()
    .regex(
      /^\+55\d{10,11}$/,
      "Informe um telefone brasileiro com DDD e código +55.",
    ),
});

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { erro: "O corpo da requisição deve conter um JSON válido." },
        { status: 400 },
      );
    }

    const validacao = enviarCodigoSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Telefone inválido.",
          detalhes: z.treeifyError(validacao.error),
        },
        { status: 400 },
      );
    }

    const { telefone } = validacao.data;

    const usuario = await prisma.usuario.findUnique({
      where: { telefone },
      select: { id: true, ativo: true },
    });

    // Resposta genérica para não revelar se o telefone existe.
    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        {
          mensagem:
            "Se o telefone estiver cadastrado, você receberá um código por SMS.",
        },
        { status: 200 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      console.error("Configuração do Twilio ausente.");

      return NextResponse.json(
        { erro: "Serviço de SMS temporariamente indisponível." },
        { status: 500 },
      );
    }

    const client = twilio(accountSid, authToken);

    await client.verify.v2.services(serviceSid).verifications.create({
      to: telefone,
      channel: "sms",
    });

    return NextResponse.json(
      {
        mensagem:
          "Se o telefone estiver cadastrado, você receberá um código por SMS.",
      },
      { status: 200 },
    );
  } catch (erro: unknown) {
    console.error("Erro ao solicitar recuperação de senha:", erro);

    return NextResponse.json(
      { erro: "Não foi possível processar a solicitação." },
      { status: 500 },
    );
  }
}
