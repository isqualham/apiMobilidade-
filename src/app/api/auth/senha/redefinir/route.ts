import { NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const redefinirSenhaSchema = z
  .object({
    telefone: z
      .string()
      .regex(
        /^\+55\d{10,11}$/,
        "Informe um telefone brasileiro com DDD e código +55.",
      ),
    codigo: z
      .string()
      .regex(/^\d{6,8}$/, "O código deve conter de 6 a 8 dígitos."),
    novaSenha: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(72, "A senha deve ter no máximo 72 caracteres."),
    confirmarSenha: z.string(),
  })
  .refine((dados) => dados.novaSenha === dados.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
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

    const validacao = redefinirSenhaSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: z.treeifyError(validacao.error),
        },
        { status: 400 },
      );
    }

    const { telefone, codigo, novaSenha } = validacao.data;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      console.error("Configuração do Twilio ausente.");

      return NextResponse.json(
        { erro: "Serviço de verificação temporariamente indisponível." },
        { status: 500 },
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { telefone },
      select: { id: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { erro: "Não foi possível validar a solicitação." },
        { status: 400 },
      );
    }

    const client = twilio(accountSid, authToken);

    const verificacao = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: telefone,
        code: codigo,
      });

    if (verificacao.status !== "approved") {
      return NextResponse.json(
        { erro: "Código inválido ou expirado." },
        { status: 400 },
      );
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash },
    });

    return NextResponse.json(
      { mensagem: "Senha redefinida com sucesso." },
      { status: 200 },
    );
  } catch (erro: unknown) {
    console.error("Erro ao redefinir senha:", erro);

    return NextResponse.json(
      { erro: "Não foi possível redefinir a senha." },
      { status: 500 },
    );
  }
}
