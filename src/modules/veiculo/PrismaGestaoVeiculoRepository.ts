import { prisma } from "@/lib/prisma";
import { Prisma, type Veiculo } from "@/generated/prisma/client";
import { ErroVeiculo } from "./CadastrarVeiculoDTO";
import { camposImportantes, transicaoVeiculoPermitida, type DecisaoVeiculoDTO, type EditarVeiculoDTO, type ListaVeiculoDTO, type PaginaVeiculoDTO } from "./GerenciarVeiculoDTO";
import type { GestaoVeiculoRepository } from "./GestaoVeiculoRepository";
import { validarDadosVeiculo } from "./ValidarDadosVeiculo";
import { conflitoDisponibilidade } from "@/modules/prestador/ConflitoDisponibilidade";
import { STATUS_ATIVOS } from "@/modules/corrida/ConsultaCorridaDTO";
async function exigirAdmin(tx: Prisma.TransactionClient, id: string) {
  if (!await tx.usuario.findFirst({ where: { id, ativo: true, administrador: true }, select: { id: true } })) throw new ErroVeiculo("Acesso permitido somente a administradores ativos.", 403);
}
function snapshot(v: Veiculo) {
  return { categoriaVeiculoId: v.categoriaVeiculoId, placa: v.placa, marca: v.marca, modelo: v.modelo, ano: v.ano, cor: v.cor, ativo: v.ativo };
}
function pagina<T extends { id: string }>(itens: T[], limite: number) {
  return { itens: itens.slice(0, limite), proximoCursor: itens.length > limite ? itens[limite - 1].id : null };
}
function paginacao(q: PaginaVeiculoDTO) {
  return { take: q.limite + 1, ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}), orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }] };
}
// A seleção é revogada sem alterar corridas ou bloquear sua conclusão.
async function revogarSelecao(tx: Prisma.TransactionClient, veiculoId: string) {
  await tx.prestador.updateMany({ where: { veiculoOnlineId: veiculoId }, data: { veiculoOnlineId: null, disponibilidadeVersao: { increment: 1 } } });
}
export class PrismaGestaoVeiculoRepository implements GestaoVeiculoRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}
  private async transacao<T>(acao: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try { return await this.banco.$transaction(acao, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") throw new ErroVeiculo("Placa já cadastrada ou conflito de dados.", 409);
      if (conflitoDisponibilidade(erro)) throw new ErroVeiculo("Conflito ao alterar veículo. Consulte a versão atual.", 409);
      throw erro;
    }
  }
  listar(admin: string, consulta: ListaVeiculoDTO) {
    return this.transacao(async tx => {
      await exigirAdmin(tx, admin);
      const itens = await tx.veiculo.findMany({ where: { statusAprovacao: consulta.status }, ...paginacao(consulta) });
      return pagina(itens, consulta.limite);
    });
  }
  historico(admin: string, id: string, consulta: PaginaVeiculoDTO) {
    return this.transacao(async tx => {
      await exigirAdmin(tx, admin);
      if (!await tx.veiculo.findUnique({ where: { id }, select: { id: true } })) throw new ErroVeiculo("Veículo não encontrado.", 404);
      return pagina(await tx.auditoriaVeiculo.findMany({ where: { veiculoId: id }, ...paginacao(consulta) }), consulta.limite);
    });
  }
  decidir(admin: string, id: string, dados: DecisaoVeiculoDTO) {
    return this.transacao(async tx => {
      await exigirAdmin(tx, admin);
      const atual = await tx.veiculo.findUnique({ where: { id } });
      if (!atual) throw new ErroVeiculo("Veículo não encontrado.", 404);
      if (atual.versao !== dados.versao || !transicaoVeiculoPermitida(atual.statusAprovacao, dados.statusAprovacao)) throw new ErroVeiculo("Versão ou transição de aprovação inválida.", 409);
      if (dados.statusAprovacao === "APROVADO") {
        const elegivel = await tx.veiculo.findFirst({ where: { id, ativo: true, prestador: { statusAprovacao: "APROVADO", usuario: { ativo: true } }, categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } }, select: { id: true } });
        if (!elegivel) throw new ErroVeiculo("Veículo, categoria, tipo e usuário devem estar ativos e prestador aprovado.", 409);
      }
      const alterados = await tx.veiculo.updateMany({ where: { id, versao: dados.versao, statusAprovacao: atual.statusAprovacao }, data: { statusAprovacao: dados.statusAprovacao, versao: { increment: 1 } } });
      if (alterados.count !== 1) throw new ErroVeiculo("Veículo alterado por outra requisição.", 409);
      const novo = await tx.veiculo.findUniqueOrThrow({ where: { id } });
      await tx.auditoriaVeiculo.create({ data: { veiculoId: id, autorId: admin, acao: "DECISAO_ADMINISTRATIVA", statusAnterior: atual.statusAprovacao, statusNovo: novo.statusAprovacao, motivo: dados.motivo, versao: novo.versao, dados: snapshot(novo) } });
      if (novo.statusAprovacao !== "APROVADO") await revogarSelecao(tx, id);
      return novo;
    });
  }
  editar(usuarioId: string, id: string, entrada: EditarVeiculoDTO) {
    return this.transacao(async tx => {
      const atual = await tx.veiculo.findFirst({ where: { id, prestador: { usuarioId, statusAprovacao: "APROVADO", usuario: { ativo: true } } } });
      if (!atual) throw new ErroVeiculo("Veículo não encontrado para o prestador autorizado.", 404);
      if (atual.versao !== entrada.versao) throw new ErroVeiculo("Veículo alterado. Consulte a versão atual.", 409);
      if (await tx.corrida.findFirst({ where: { veiculoId: id, status: { in: STATUS_ATIVOS } }, select: { id: true } })) throw new ErroVeiculo("Não é possível editar veículo vinculado a corrida ativa.", 409);
      const dados = validarDadosVeiculo({ ...atual, ...entrada });
      if (!await tx.categoriaVeiculo.findFirst({ where: { id: dados.categoriaVeiculoId, ativo: true, tipoVeiculo: { ativo: true } }, select: { id: true } })) throw new ErroVeiculo("Categoria ou tipo inativo/inexistente.");
      const importante = camposImportantes.some(campo => atual[campo] !== dados[campo]);
      if (!importante && atual.ativo === dados.ativo && atual.imagemUrl === dados.imagemUrl) return atual;
      const status = importante && atual.statusAprovacao !== "SUSPENSO" ? "PENDENTE" : atual.statusAprovacao;
      const alterados = await tx.veiculo.updateMany({ where: { id, versao: entrada.versao }, data: { ...dados, statusAprovacao: status, versao: { increment: 1 } } });
      if (alterados.count !== 1) throw new ErroVeiculo("Veículo alterado por outra requisição.", 409);
      const novo = await tx.veiculo.findUniqueOrThrow({ where: { id } });
      await tx.auditoriaVeiculo.create({ data: { veiculoId: id, autorId: usuarioId, acao: "ALTERACAO_CADASTRAL", statusAnterior: atual.statusAprovacao, statusNovo: novo.statusAprovacao, motivo: importante ? "Dados relevantes alterados pelo prestador; avaliação administrativa necessária." : "Atualização de atividade ou imagem pelo prestador.", versao: novo.versao, dados: { antes: snapshot(atual), depois: snapshot(novo) } } });
      if (importante || !novo.ativo) await revogarSelecao(tx, id);
      return novo;
    });
  }
}
