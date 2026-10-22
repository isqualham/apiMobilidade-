import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  exigirAdministrador,
  TokenInvalidoError,
  AcessoNegadoError,
} from "@/modules/auth/AutenticarRequisicao";
import { cadastrarUsuarioSchema } from "@/modules/usuario/CadastrarUsuarioDTO";
import { PrismaUsuarioRepository } from "@/modules/usuario/PrismaUsuarioRepository";
import { CadastrarUsuarioUseCase } from "@/modules/usuario/CadastrarUsuarioUseCase";

export async function GET(request: Request) {
  try {
    await exigirAdministrador(request);

    const { searchParams } = new URL(request.url);

    const paginaParam = searchParams.get("pagina") ?? "1";
    const limiteParam = searchParams.get("limite") ?? "10";
    const pesquisa = searchParams.get("pesquisa")?.trim() ?? "";
    const ativoParam = searchParams.get("ativo");

    const pagina = Number(paginaParam);
    const limite = Number(limiteParam);

    if (
      !Number.isInteger(pagina) ||
      pagina < 1 ||
      !Number.isInteger(limite) ||
      limite < 1 ||
      limite > 100
    ) {
      return NextResponse.json(
        {
          erro: "Parâmetros inválidos. Informe pagina >= 1 e limite entre 1 e 100.",
        },
        { status: 400 },
      );
    }

    if (
      ativoParam !== null &&
      ativoParam !== "true" &&
      ativoParam !== "false"
    ) {
      return NextResponse.json(
        { erro: "O filtro ativo deve ser true ou false." },
        { status: 400 },
      );
    }

    const where: Prisma.UsuarioWhereInput = {
      ...(pesquisa
        ? {
            OR: [
              { nome: { contains: pesquisa, mode: "insensitive" } },
              { email: { contains: pesquisa, mode: "insensitive" } },
              { cpf: { contains: pesquisa } },
            ],
          }
        : {}),
      ...(ativoParam !== null ? { ativo: ativoParam === "true" } : {}),
    };

    const [usuarios, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          cpf: true,
          email: true,
          telefone: true,
          ativo: true,
          administrador: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.usuario.count({ where }),
    ]);

    return NextResponse.json(
      {
        dados: usuarios,
        paginacao: {
          pagina,
          limite,
          total,
          totalPaginas: Math.ceil(total / limite),
        },
      },
      { status: 200 },
    );
  } catch (erro: unknown) {
    if (erro instanceof TokenInvalidoError) {
      return NextResponse.json({ erro: erro.message }, { status: 401 });
    }

    if (erro instanceof AcessoNegadoError) {
      return NextResponse.json({ erro: erro.message }, { status: 403 });
    }

    console.error("Erro ao listar usuários:", erro);

    return NextResponse.json(
      { erro: "Não foi possível listar os usuários." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validacao = cadastrarUsuarioSchema.safeParse(body);

    if (!validacao.success) {
      return NextResponse.json(
        {
          erro: "Dados inválidos.",
          detalhes: validacao.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const repository = new PrismaUsuarioRepository();

    const [cpfExiste, emailExiste] = await Promise.all([
      repository.existePorCPF(validacao.data.cpf),
      repository.existePorEmail(validacao.data.email),
    ]);

    if (cpfExiste || emailExiste) {
      const erros: string[] = [];

      if (cpfExiste) {
        erros.push("Este CPF já está cadastrado.");
      }

      if (emailExiste) {
        erros.push("Este e-mail já está cadastrado.");
      }

      return NextResponse.json({ erro: erros.join(" ") }, { status: 409 });
    }

    const useCase = new CadastrarUsuarioUseCase(repository);
    const usuario = await useCase.executar(validacao.data);

    return NextResponse.json(usuario, { status: 201 });
  } catch (erro: unknown) {
    if (erro instanceof SyntaxError) {
      return NextResponse.json(
        { erro: "Corpo da requisição JSON inválido." },
        { status: 400 },
      );
    }

    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === "P2002") {
        return NextResponse.json(
          { erro: "CPF ou e-mail já cadastrado." },
          { status: 409 },
        );
      }
    }

    if (erro instanceof Error) {
      if (erro.message.includes("Termos de Uso ativos")) {
        return NextResponse.json({ erro: erro.message }, { status: 503 });
      }
    }

    console.error("Erro ao cadastrar usuário:", erro);

    return NextResponse.json(
      { erro: "Não foi possível cadastrar o usuário." },
      { status: 500 },
    );
  }
}
