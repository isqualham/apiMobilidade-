import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";

export async function POST(request: NextRequest) {
  try {
    const { id: usuarioId } = await autenticarRequisicao(request);

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        telefone: true,
        telefoneVerificado: true,
        ativo: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { erro: "Usuário não encontrado ou inativo." },
        { status: 403 },
      );
    }

    if (!usuario.telefone) {
      return NextResponse.json(
        { erro: "Nenhum telefone cadastrado para este usuário." },
        { status: 400 },
      );
    }

    if (!/^\+[1-9]\d{7,14}$/.test(usuario.telefone)) {
      return NextResponse.json(
        { erro: "O telefone cadastrado não está em um formato válido." },
        { status: 400 },
      );
    }

    if (usuario.telefoneVerificado) {
      return NextResponse.json({
        enviado: false,
        verificado: true,
        mensagem: "O telefone já está verificado.",
      });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      console.error("Configuração do Twilio ausente.");

      return NextResponse.json(
        { erro: "Serviço de SMS não configurado." },
        { status: 500 },
      );
    }

    const client = twilio(accountSid, authToken);

    const verificacao = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: usuario.telefone,
        channel: "sms",
      });

    return NextResponse.json(
      {
        enviado: true,
        verificado: false,
        mensagem: "Solicitação de envio realizada.",
        status: verificacao.status,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: error.message }, { status: 401 });
    }
    console.error("Erro ao solicitar código SMS:", error);

    return NextResponse.json(
      { erro: "Não foi possível enviar o código SMS." },
      { status: 500 },
    );
  }
}
