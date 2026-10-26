import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { GET, POST } from "@/app/api/veiculos/route";
import { prisma } from "@/lib/prisma";
import { swaggerSpec } from "@/lib/swagger";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaVeiculoRepository } from "@/modules/veiculo/PrismaVeiculoRepository";

vi.mock("@/lib/prisma", () => ({ prisma: {
  usuario: { findUnique: vi.fn() },
  prestador: { findUnique: vi.fn() },
  veiculo: { findMany: vi.fn(), create: vi.fn() },
} }));

const usuarioId = "00000000-0000-4000-8000-000000000001";
const prestadorId = "00000000-0000-4000-8000-000000000002";
const usuario = {
  id: usuarioId, nome: "Teste", email: "teste@example.invalid", ativo: true,
  administrador: false, telefoneVerificado: true,
  prestador: { statusAprovacao: "APROVADO" },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue(usuario as never);
  vi.mocked(prisma.prestador.findUnique).mockResolvedValue({ id: prestadorId, statusAprovacao: "APROVADO" } as never);
  vi.mocked(prisma.veiculo.findMany).mockResolvedValue([]);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function request(token?: string, method = "GET") {
  return new NextRequest("http://localhost/api/veiculos", {
    method, headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
  });
}
function tokenValido() {
  return gerarToken({ sub: usuarioId, nome: usuario.nome, email: usuario.email, administrador: false });
}

it.each(["ausente", "vazio", "invalido", "expirado", "assinatura incorreta"])(
  "GET retorna 401 para token %s sem consultar veículos", async (cenario) => {
    let token: string | undefined;
    if (cenario === "vazio") token = "";
    if (cenario === "invalido") token = "token-invalido";
    if (cenario === "expirado" || cenario === "assinatura incorreta") {
      const chave = cenario === "expirado"
        ? new TextEncoder().encode(process.env.JWT_SECRET) : randomBytes(32);
      token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(usuarioId)
        .setExpirationTime(cenario === "expirado" ? 1 : "1h").sign(chave);
    }
    const resposta = await GET(request(token));
    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ mensagem: "Token ausente ou inválido." });
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    expect(prisma.prestador.findUnique).not.toHaveBeenCalled();
    expect(prisma.veiculo.findMany).not.toHaveBeenCalled();
  },
);

it.each([null, { ...usuario, ativo: false }])("GET retorna 401 para usuário inexistente/inativo", async (registro) => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue(registro as never);
  expect((await GET(request(await tokenValido()))).status).toBe(401);
  expect(prisma.prestador.findUnique).not.toHaveBeenCalled();
  expect(prisma.veiculo.findMany).not.toHaveBeenCalled();
});

it.each([null, "PENDENTE", "REJEITADO"])("GET preserva 403 para prestador %s", async (statusAprovacao) => {
  vi.mocked(prisma.prestador.findUnique).mockResolvedValue(
    (statusAprovacao ? { id: prestadorId, statusAprovacao } : null) as never,
  );
  expect((await GET(request(await tokenValido()))).status).toBe(403);
  expect(prisma.veiculo.findMany).not.toHaveBeenCalled();
});

it("GET preserva 200 e consulta apenas veículos do prestador autenticado", async () => {
  const resposta = await GET(request(await tokenValido()));
  expect(resposta.status).toBe(200);
  expect(await resposta.json()).toEqual({ veiculos: [] });
  expect(prisma.prestador.findUnique).toHaveBeenCalledWith({
    where: { usuarioId }, select: { id: true, statusAprovacao: true },
  });
  expect(prisma.veiculo.findMany).toHaveBeenCalledWith({
    where: { prestadorId }, orderBy: { createdAt: "desc" },
  });
});

it("GET preserva 500 para falha interna, sem expor detalhes", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(prisma.usuario.findUnique).mockRejectedValue(new Error("Falha de banco"));
  const resposta = await GET(request(await tokenValido()));
  expect(resposta.status).toBe(500);
  expect(await resposta.json()).toEqual({ mensagem: "Erro interno do servidor." });
});

it("POST também utiliza o tratador compartilhado de autenticação", async () => {
  expect((await POST(request(undefined, "POST"))).status).toBe(401);
  expect(prisma.veiculo.create).not.toHaveBeenCalled();
});

it.each([null, "PENDENTE", "REJEITADO"])("POST preserva 403 para prestador %s antes de ler o corpo", async (statusAprovacao) => {
  vi.mocked(prisma.prestador.findUnique).mockResolvedValue(
    (statusAprovacao ? { id: prestadorId, statusAprovacao } : null) as never,
  );
  expect((await POST(request(await tokenValido(), "POST"))).status).toBe(403);
  expect(prisma.veiculo.create).not.toHaveBeenCalled();
});

async function cadastrar(corpo: string) {
  return POST(new NextRequest("http://localhost/api/veiculos", {
    method: "POST", headers: { Authorization: `Bearer ${await tokenValido()}`, "Content-Type": "application/json" },
    body: corpo,
  }));
}

it.each(["{", "{}"])("POST preserva 400 para corpo inválido %s", async (corpo) => {
  expect((await cadastrar(corpo)).status).toBe(400);
  expect(prisma.veiculo.create).not.toHaveBeenCalled();
});

const dadosVeiculo = { categoriaVeiculoId: usuarioId, placa: "abc1d23", marca: "Marca", modelo: "Modelo", ano: 2024 };

it("POST preserva cadastro 201 com identidade do banco e normalização", async () => {
  vi.spyOn(PrismaVeiculoRepository.prototype, "verificarCategoriaAtiva").mockResolvedValue(true);
  vi.spyOn(PrismaVeiculoRepository.prototype, "buscarPorPlaca").mockResolvedValue(null);
  vi.mocked(prisma.veiculo.create).mockResolvedValue({ ...dadosVeiculo, prestadorId, placa: "ABC1D23" } as never);
  const resposta = await cadastrar(JSON.stringify({ ...dadosVeiculo, prestadorId: "outro-prestador" }));
  expect(resposta.status).toBe(201);
  expect(await resposta.json()).toEqual({
    mensagem: "Veículo cadastrado com sucesso.", veiculo: { ...dadosVeiculo, prestadorId, placa: "ABC1D23" },
  });
  expect(prisma.veiculo.create).toHaveBeenCalledWith({ data: {
    ...dadosVeiculo, prestadorId, placa: "ABC1D23", cor: null, imagemUrl: null, ativo: true,
  } });
});

it("POST preserva 409 para placa já cadastrada", async () => {
  vi.spyOn(PrismaVeiculoRepository.prototype, "verificarCategoriaAtiva").mockResolvedValue(true);
  vi.spyOn(PrismaVeiculoRepository.prototype, "buscarPorPlaca").mockResolvedValue({ id: usuarioId } as never);
  expect((await cadastrar(JSON.stringify(dadosVeiculo))).status).toBe(409);
  expect(prisma.veiculo.create).not.toHaveBeenCalled();
});

it("Swagger documenta autenticação Bearer e respostas 401/403 de veículos", () => {
  const documento = swaggerSpec as OpenAPIV3.Document;
  for (const metodo of ["get", "post"] as const) {
    const operacao = documento.paths["/api/veiculos"]?.[metodo];
    expect(operacao?.security).toEqual([{ bearerAuth: [] }]);
    expect(operacao?.responses).toHaveProperty("401");
    expect(operacao?.responses).toHaveProperty("403");
  }
});
