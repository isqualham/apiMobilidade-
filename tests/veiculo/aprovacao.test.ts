import { expect, it, vi } from "vitest";
import type { PrismaClient, Veiculo } from "@/generated/prisma/client";
import { PrismaGestaoVeiculoRepository } from "@/modules/veiculo/PrismaGestaoVeiculoRepository";
import { GerenciarVeiculoUseCase } from "@/modules/veiculo/GerenciarVeiculoUseCase";
import { validarDadosVeiculo } from "@/modules/veiculo/ValidarDadosVeiculo";
import { PrismaVeiculoRepository } from "@/modules/veiculo/PrismaVeiculoRepository";
import { prisma } from "@/lib/prisma";
vi.mock("@/lib/prisma", () => ({ prisma: { veiculo: { create: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const entrada = { categoriaVeiculoId: id, placa: "ABC1D23", marca: "Marca", modelo: "Modelo", ano: 2024 };
function setup(status: Veiculo["statusAprovacao"] = "PENDENTE") {
  let atual: Veiculo = { ...entrada, id, prestadorId: id, cor: null, imagemUrl: null, ativo: true, statusAprovacao: status, versao: 0, createdAt: new Date(), updatedAt: new Date() };
  const tx = {
    usuario: { findFirst: vi.fn().mockResolvedValue({ id }) },
    veiculo: {
      findUnique: vi.fn(async () => ({ ...atual })), findFirst: vi.fn(async () => ({ ...atual })),
      findUniqueOrThrow: vi.fn(async () => ({ ...atual })), findMany: vi.fn(async () => [{ ...atual }]),
      updateMany: vi.fn(async ({ data }) => { atual = { ...atual, ...data, versao: atual.versao + 1 }; return { count: 1 }; }),
    },
    auditoriaVeiculo: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    prestador: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    corrida: { findFirst: vi.fn().mockResolvedValue(null) },
    categoriaVeiculo: { findFirst: vi.fn().mockResolvedValue({ id }) },
  };
  const banco = { $transaction: vi.fn(async callback => callback(tx)) };
  const repo = new PrismaGestaoVeiculoRepository(banco as unknown as PrismaClient);
  return { tx, banco, repo, useCase: new GerenciarVeiculoUseCase(repo) };
}
it("marca aceita 80 e recusa 81 caracteres; imagem omitida/null é opcional", () => {
  expect(validarDadosVeiculo({ ...entrada, marca: "A".repeat(80) }).imagemUrl).toBeNull();
  expect(validarDadosVeiculo({ ...entrada, imagemUrl: null }).imagemUrl).toBeNull();
  expect(() => validarDadosVeiculo({ ...entrada, marca: "A".repeat(81) })).toThrow("80");
  expect(() => validarDadosVeiculo({ ...entrada, imagemUrl: "inválida" })).toThrow();
});
it("cadastro força PENDENTE mesmo se o cliente tentar aprovar", async () => {
  await new PrismaVeiculoRepository().cadastrar(id, { ...entrada, statusAprovacao: "APROVADO" } as typeof entrada);
  expect(prisma.veiculo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ statusAprovacao: "PENDENTE", imagemUrl: null, ativo: true }) });
});
it("aprovação gera histórico com autor, motivo, snapshot e versão na mesma transação", async () => {
  const { repo, tx, banco } = setup();
  const novo = await repo.decidir(id, id, { statusAprovacao: "APROVADO", motivo: "Documentos conferidos", versao: 0 });
  expect(novo).toMatchObject({ statusAprovacao: "APROVADO", versao: 1 });
  expect(tx.auditoriaVeiculo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ autorId: id, veiculoId: id, statusAnterior: "PENDENTE", statusNovo: "APROVADO", motivo: "Documentos conferidos", versao: 1, dados: expect.objectContaining({ placa: entrada.placa }) }) });
  expect(banco.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it.each(["REJEITADO", "SUSPENSO"] as const)("%s revoga seleção Online sem editar corrida", async statusAprovacao => {
  const { repo, tx } = setup();
  await repo.decidir(id, id, { statusAprovacao, motivo: "Decisão justificada", versao: 0 });
  expect(tx.prestador.updateMany).toHaveBeenCalledWith({ where: { veiculoOnlineId: id }, data: { veiculoOnlineId: null, disponibilidadeVersao: { increment: 1 } } });
  expect(tx.corrida.findFirst).not.toHaveBeenCalled();
});
it.each(["listar", "historico", "decidir"] as const)("revalida administrador no banco em %s", async operacao => {
  const { repo, tx } = setup(); tx.usuario.findFirst.mockResolvedValue(null);
  const acao = operacao === "listar" ? repo.listar(id, { limite: 20 }) : operacao === "historico" ? repo.historico(id, id, { limite: 20 }) : repo.decidir(id, id, { statusAprovacao: "APROVADO", motivo: "Motivo teste", versao: 0 });
  await expect(acao).rejects.toMatchObject({ statusCode: 403 });
  expect(tx.veiculo.updateMany).not.toHaveBeenCalled();
});
it("recusa decisão sem veículo e sem elegibilidade", async () => {
  const { repo, tx } = setup(); tx.veiculo.findUnique.mockResolvedValueOnce(null as never);
  await expect(repo.decidir(id, id, { statusAprovacao: "APROVADO", motivo: "Motivo teste", versao: 0 })).rejects.toMatchObject({ statusCode: 404 });
  tx.veiculo.findFirst.mockResolvedValueOnce(null as never);
  await expect(repo.decidir(id, id, { statusAprovacao: "APROVADO", motivo: "Motivo teste", versao: 0 })).rejects.toMatchObject({ statusCode: 409 });
});
it("recusa versão antiga, decisão repetida e transição inválida", async () => {
  const { repo, tx } = setup("APROVADO");
  for (const [statusAprovacao, versao] of [["SUSPENSO", 2], ["APROVADO", 0], ["REJEITADO", 0]] as const) {
    await expect(repo.decidir(id, id, { statusAprovacao, motivo: "Motivo teste", versao })).rejects.toMatchObject({ statusCode: 409 });
  }
  expect(tx.auditoriaVeiculo.create).not.toHaveBeenCalled();
});
it.each(["PENDENTE", "APROVADO", "REJEITADO", "SUSPENSO"] as const)("alteração importante exige revisão sem liberar %s", async status => {
  const { repo, tx } = setup(status);
  const novo = await repo.editar(id, id, { versao: 0, marca: "Nova marca" });
  expect(novo.statusAprovacao).toBe(status === "SUSPENSO" ? "SUSPENSO" : "PENDENTE");
  expect(novo.versao).toBe(1);
  expect(tx.auditoriaVeiculo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ acao: "ALTERACAO_CADASTRAL", autorId: id, dados: expect.objectContaining({ antes: expect.objectContaining({ marca: "Marca" }), depois: expect.objectContaining({ marca: "Nova marca" }) }) }) });
  expect(tx.prestador.updateMany).toHaveBeenCalled();
});
it("recusa edição de terceiros, versão antiga e corrida ativa", async () => {
  const { repo, tx } = setup();
  tx.veiculo.findFirst.mockResolvedValueOnce(null as never);
  await expect(repo.editar(id, id, { versao: 0, ano: 2025 })).rejects.toMatchObject({ statusCode: 404 });
  await expect(repo.editar(id, id, { versao: 2, ano: 2025 })).rejects.toMatchObject({ statusCode: 409 });
  tx.corrida.findFirst.mockResolvedValue({ id });
  await expect(repo.editar(id, id, { versao: 0, ano: 2025 })).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.veiculo.updateMany).not.toHaveBeenCalled();
});
it("trocar somente imagem não exige reaprovação; reenvio idêntico não altera versão", async () => {
  const { repo, tx } = setup("APROVADO");
  expect((await repo.editar(id, id, { versao: 0, imagemUrl: null })).versao).toBe(0);
  expect(tx.auditoriaVeiculo.create).not.toHaveBeenCalled();
  expect((await repo.editar(id, id, { versao: 0, imagemUrl: "https://example.com/foto.jpg" })).statusAprovacao).toBe("APROVADO");
  expect(tx.prestador.updateMany).not.toHaveBeenCalled();
});
it("desativar revoga seleção, reativar não aprova veículo", async () => {
  const { repo, tx } = setup("REJEITADO");
  expect((await repo.editar(id, id, { versao: 0, ativo: false })).statusAprovacao).toBe("REJEITADO");
  expect(tx.prestador.updateMany).toHaveBeenCalled();
  expect((await repo.editar(id, id, { versao: 1, ativo: true })).statusAprovacao).toBe("REJEITADO");
});
it.each([{}, { statusAprovacao: "APROVADO", motivo: "", versao: 0 }, { statusAprovacao: "PENDENTE", motivo: "Motivo teste", versao: 0 }, { statusAprovacao: "APROVADO", motivo: "Motivo teste", versao: 0, administradorId: id }])("valida decisão e rejeita permissões do cliente", corpo => {
  const { useCase } = setup(); expect(() => useCase.decidir(id, id, corpo)).toThrow();
});
it("edição não aceita status de aprovação e consultas rejeitam campos desconhecidos", () => {
  const { useCase } = setup();
  expect(() => useCase.editar(id, id, { versao: 0, statusAprovacao: "APROVADO" })).toThrow();
  expect(() => useCase.editar(id, id, { versao: 0 })).toThrow();
  expect(() => useCase.listar(id, new URLSearchParams("limite=51"))).toThrow();
  expect(() => useCase.listar(id, new URLSearchParams("limite=2&limite=3"))).toThrow();
  expect(() => useCase.historico(id, id, new URLSearchParams("usuarioId=outro"))).toThrow();
});
