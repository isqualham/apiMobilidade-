import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { CorridaError } from "./CorridaDTO";
import type { CorridaConsultaRepository } from "./CorridaConsultaRepository";
import {
  STATUS_ATIVOS, STATUS_HISTORICO, codificarCursor,
  type CursorCorrida, type DetalheCorridaDTO, type HistoricoConsulta,
  type OfertasConsulta, type PapelCorrida,
} from "./ConsultaCorridaDTO";

const resumoSelect = {
  id: true, status: true, categoriaVeiculoId: true, distanciaKm: true,
  valorTotal: true, valorFinalCobrado: true, createdAt: true,
} satisfies Prisma.CorridaSelect;
const detalheSelect = {
  ...resumoSelect, passageiroId: true,
  origemEndereco: true, origemLatitude: true, origemLongitude: true,
  destinoEndereco: true, destinoLatitude: true, destinoLongitude: true,
  valorKmAplicado: true, distanciaPercorridaKm: true,
  dataAceite: true, dataInicio: true, dataFinalizacao: true, dataCancelamento: true,
  veiculo: { select: { placa: true, marca: true, modelo: true, cor: true } },
} satisfies Prisma.CorridaSelect;
// Não seleciona endereço textual, identidade ou contato do passageiro.
const ofertaSelect = {
  id: true, status: true, categoriaVeiculoId: true, distanciaKm: true,
  valorTotal: true, createdAt: true,
  origemLatitude: true, origemLongitude: true, destinoLatitude: true, destinoLongitude: true,
} satisfies Prisma.CorridaSelect;
type ResumoBanco = Prisma.CorridaGetPayload<{ select: typeof resumoSelect }>;
type DetalheBanco = Prisma.CorridaGetPayload<{ select: typeof detalheSelect }>;
function resumo(c: ResumoBanco) {
  return { id: c.id, status: c.status, categoriaVeiculoId: c.categoriaVeiculoId,
    distanciaKm: Number(c.distanciaKm), valorTotal: Number(c.valorTotal),
    valorFinalCobrado: c.valorFinalCobrado === null ? null : Number(c.valorFinalCobrado),
    createdAt: c.createdAt.toISOString() };
}
function detalhe(c: DetalheBanco, usuarioId: string): DetalheCorridaDTO {
  return { ...resumo(c), papel: c.passageiroId === usuarioId ? "passageiro" : "prestador",
    origem: { endereco: c.origemEndereco, latitude: Number(c.origemLatitude), longitude: Number(c.origemLongitude) },
    destino: { endereco: c.destinoEndereco, latitude: Number(c.destinoLatitude), longitude: Number(c.destinoLongitude) },
    valorKmAplicado: Number(c.valorKmAplicado),
    distanciaPercorridaKm: c.distanciaPercorridaKm === null ? null : Number(c.distanciaPercorridaKm),
    dataAceite: c.dataAceite?.toISOString() ?? null, dataInicio: c.dataInicio?.toISOString() ?? null,
    dataFinalizacao: c.dataFinalizacao?.toISOString() ?? null, dataCancelamento: c.dataCancelamento?.toISOString() ?? null,
    veiculo: c.veiculo,
  };
}
function participante(usuarioId: string, papel: PapelCorrida = "todos"): Prisma.CorridaWhereInput {
  const passageiro = { passageiroId: usuarioId };
  const prestador = { prestador: { usuarioId } };
  return papel === "passageiro" ? passageiro : papel === "prestador" ? prestador : { OR: [passageiro, prestador] };
}
function aposCursor(cursor: CursorCorrida | undefined, direcao: "asc" | "desc"): Prisma.CorridaWhereInput {
  if (!cursor) return {};
  const operador = direcao === "asc" ? "gt" : "lt";
  const createdAt = new Date(cursor.createdAt);
  return { OR: [ { createdAt: { [operador]: createdAt } }, { createdAt, id: { [operador]: cursor.id } } ] };
}
function pagina<T extends { id: string; createdAt: Date }, R>(linhas: T[], limite: number, converter: (c: T) => R) {
  const selecionadas = linhas.slice(0, limite);
  const ultima = selecionadas.at(-1);
  return {
    corridas: selecionadas.map(converter),
    proximoCursor: linhas.length > limite && ultima
      ? codificarCursor({ createdAt: ultima.createdAt.toISOString(), id: ultima.id }) : null,
  };
}

export class PrismaCorridaConsultaRepository implements CorridaConsultaRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}

  async disponiveis(usuarioId: string, consulta: OfertasConsulta) {
    return this.banco.$transaction(async (tx) => {
      const prestador = await tx.prestador.findFirst({
        where: { usuarioId, statusAprovacao: "APROVADO", usuario: { ativo: true } },
        select: {
          id: true,
          veiculos: {
            where: { id: consulta.veiculoId, ativo: true, categoriaVeiculo: { ativo: true, tipoVeiculo: { ativo: true } } },
            select: { categoriaVeiculoId: true }, take: 1,
          },
          corridas: { where: { status: { in: STATUS_ATIVOS } }, select: { id: true }, take: 1 },
        },
      });
      if (!prestador) throw new CorridaError("Somente prestadores ativos e aprovados podem consultar ofertas.", 403);
      const veiculo = prestador.veiculos[0];
      if (!veiculo) throw new CorridaError("Veículo próprio, ativo e de categoria ativa é obrigatório.", 403);
      if (prestador.corridas.length) throw new CorridaError("Prestador já possui uma corrida ativa.", 409);
      const linhas = await tx.corrida.findMany({
        where: { AND: [
          { status: "SOLICITADA", prestadorId: null, passageiroId: { not: usuarioId },
            passageiro: { ativo: true }, categoriaVeiculoId: veiculo.categoriaVeiculoId },
          aposCursor(consulta.cursor, "asc"),
        ] },
        select: ofertaSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: consulta.limite + 1,
      });
      const aproximar = (valor: Prisma.Decimal) => Math.round(Number(valor) * 100) / 100;
      return pagina(linhas, consulta.limite, (c) => ({
        id: c.id, status: c.status, categoriaVeiculoId: c.categoriaVeiculoId,
        distanciaKm: Number(c.distanciaKm), valorTotal: Number(c.valorTotal), createdAt: c.createdAt.toISOString(),
        origemAproximada: { latitude: aproximar(c.origemLatitude), longitude: aproximar(c.origemLongitude) },
        destinoAproximado: { latitude: aproximar(c.destinoLatitude), longitude: aproximar(c.destinoLongitude) },
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async ativa(usuarioId: string, papel: PapelCorrida) {
    const corridas = await this.banco.corrida.findMany({
      where: { AND: [participante(usuarioId, papel), { status: { in: STATUS_ATIVOS } }] },
      select: detalheSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2,
    });
    if (corridas.length > 1) throw new CorridaError("Mais de uma corrida ativa. Selecione o papel; se persistir, solicite suporte.", 409);
    return corridas[0] ? detalhe(corridas[0], usuarioId) : null;
  }

  async detalhe(usuarioId: string, corridaId: string) {
    const corrida = await this.banco.corrida.findFirst({
      where: { AND: [{ id: corridaId }, participante(usuarioId)] }, select: detalheSelect,
    });
    return corrida ? detalhe(corrida, usuarioId) : null;
  }

  async historico(usuarioId: string, consulta: HistoricoConsulta) {
    const linhas = await this.banco.corrida.findMany({
      where: { AND: [participante(usuarioId, consulta.papel),
        { status: consulta.status ?? { in: [...STATUS_HISTORICO] } }, aposCursor(consulta.cursor, "desc") ] },
      select: resumoSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: consulta.limite + 1,
    });
    return pagina(linhas, consulta.limite, resumo);
  }
}
