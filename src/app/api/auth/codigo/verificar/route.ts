import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { autenticarRequisicao, TokenInvalidoError } from "@/modules/auth/AutenticarRequisicao";

export async function POST(request: NextRequest) {
  try {
    const { id: usuarioId } = await autenticarRequisicao(request);

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("codigo" in body) ||
      typeof body.codigo !== "string" ||
      !/^\d{6,8}$/.test(body.codigo)
    ) {
      return NextResponse.json(
        { erro: "O código deve conter de 6 a 8 dígitos." },
        { status: 400 },
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
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

    if (usuario.telefoneVerificado) {
      return NextResponse.json({
        verificado: true,
        mensagem: "Telefone já verificado.",
      });
    }

    if (!/^\+[1-9]\d{7,14}$/.test(usuario.telefone)) {
      return NextResponse.json(
        { erro: "O telefone cadastrado não está em um formato válido." },
        { status: 400 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      console.error("Configuração do Twilio ausente.");

      return NextResponse.json(
        { erro: "Serviço de verificação não configurado." },
        { status: 500 },
      );
    }

    const client = twilio(accountSid, authToken);

    const verificacao = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: usuario.telefone,
        code: body.codigo,
      });

    if (verificacao.status !== "approved") {
      return NextResponse.json(
        {
          verificado: false,
          mensagem: "Código inválido ou expirado.",
        },
        { status: 400 },
      );
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { telefoneVerificado: true },
    });

    return NextResponse.json({
      verificado: true,
      mensagem: "Telefone verificado com sucesso.",
    });
  } catch (error) {
    if (error instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: error.message }, { status: 401 });
    }
    console.error("Erro ao verificar código SMS:", error);

    return NextResponse.json(
      { erro: "Não foi possível verificar o código." },
      { status: 500 },
    );
  }
}
