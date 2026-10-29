import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/modules/auth/TokenService";
import { PrismaGestaoVeiculoRepository } from "@/modules/veiculo/PrismaGestaoVeiculoRepository";
import { GET as listar } from "@/app/api/admin/veiculos/route";
import { GET as historico } from "@/app/api/admin/veiculos/[id]/historico/route";
import { PATCH as decidir } from "@/app/api/admin/veiculos/[id]/aprovacao/route";
import { PATCH as editar } from "@/app/api/veiculos/[id]/route";
vi.mock("@/lib/prisma", () => ({ prisma: { sessaoAuth: { findFirst: vi.fn() }, usuario: { findUnique: vi.fn() } } }));
const id = "00000000-0000-4000-8000-000000000001";
const contexto = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.mocked(prisma.sessaoAuth.findFirst).mockResolvedValue({
    revogadaEm: null, motivoRevogacao: null, expiraEm: new Date(Date.now() + 86400000),
  } as never);
  vi.stubEnv("JWT_SECRET", randomBytes(32).toString("hex"));
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true, administrador: true } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const token = () => gerarToken({ sid: "00000000-0000-4000-8000-000000000099", sub: id, nome: "Teste", email: "teste@test.invalid", administrador: true });
function req(bearer?: string, corpo: unknown = { statusAprovacao: "APROVADO", motivo: "Documentos conferidos", versao: 0 }) {
  return new Request("http://localhost/api/admin/veiculos", { method: "PATCH", headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body: JSON.stringify(corpo) });
}
async function statusRotas(bearer?: string) {
  return [(await listar(req(bearer))).status, (await historico(req(bearer), contexto)).status, (await decidir(req(bearer), contexto)).status];
}
it.each([undefined, "invalido"])("endpoints administrativos e edição recusam JWT ausente/inválido", async bearer => {
  expect(await statusRotas(bearer)).toEqual([401, 401, 401]);
  expect((await editar(req(bearer), contexto)).status).toBe(401);
});
it("JWT expirado não é aceito", async () => {
  const expirado = await new SignJWT({ administrador: true }).setProtectedHeader({ alg: "HS256" }).setSubject(id).setExpirationTime(1).sign(new TextEncoder().encode(process.env.JWT_SECRET));
  expect(await statusRotas(expirado)).toEqual([401, 401, 401]);
});
it("permissão administrativa é lida no banco, não do JWT", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: true, administrador: false } as never);
  expect(await statusRotas(await token())).toEqual([403, 403, 403]);
});
it("administrador inativo não pode acessar", async () => {
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id, ativo: false, administrador: true } as never);
  expect(await statusRotas(await token())).toEqual([401, 401, 401]);
});
it("administrador autenticado acessa lista, histórico e decisão com sua identidade", async () => {
  const lista = vi.spyOn(PrismaGestaoVeiculoRepository.prototype, "listar").mockResolvedValue({ itens: [], proximoCursor: null });
  const hist = vi.spyOn(PrismaGestaoVeiculoRepository.prototype, "historico").mockResolvedValue({ itens: [], proximoCursor: null });
  const decisao = vi.spyOn(PrismaGestaoVeiculoRepository.prototype, "decidir").mockResolvedValue({ id, statusAprovacao: "APROVADO", versao: 1 } as never);
  expect(await statusRotas(await token())).toEqual([200, 200, 200]);
  expect(lista).toHaveBeenCalledWith(id, { limite: 20 });
  expect(hist).toHaveBeenCalledWith(id, id, { limite: 20 });
  expect(decisao).toHaveBeenCalledWith(id, id, { statusAprovacao: "APROVADO", motivo: "Documentos conferidos", versao: 0 });
  expect((await decidir(req(await token(), { statusAprovacao: "APROVADO", motivo: "Motivo teste", versao: 0, administradorId: "outro" }), contexto)).status).toBe(400);
  expect(decisao).toHaveBeenCalledTimes(1);
});
it("edição usa identidade autenticada e não aceita alteração de aprovação", async () => {
  const mudar = vi.spyOn(PrismaGestaoVeiculoRepository.prototype, "editar").mockResolvedValue({ id, statusAprovacao: "PENDENTE", versao: 1 } as never);
  const bearer = await token();
  expect((await editar(req(bearer, { versao: 0, marca: "Nova" }), contexto)).status).toBe(200);
  expect(mudar).toHaveBeenCalledWith(id, id, { versao: 0, marca: "Nova" });
  expect((await editar(req(bearer), contexto)).status).toBe(400);
});
