import { conflitoDisponibilidade } from "@/modules/prestador/ConflitoDisponibilidade";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

import {
  CorridaError,
  type CorridaResponseDTO,
  type CancelarCorridaDTO,
  type EncerrarCorridaAntecipadamenteDTO,
} from "./CorridaDTO";

import type {
  CorridaRepository,
  CriarCorridaRepositoryDTO,
  AceiteCorridaRepositoryDTO,
} from "./CorridaRepository";

type CorridaBanco = Awaited<ReturnType<typeof prisma.corrida.findFirst>>;

function converter(corrida: NonNullable<CorridaBanco>): CorridaResponseDTO {
  return {
    id: corrida.id,
    passageiroId: corrida.passageiroId,
    prestadorId: corrida.prestadorId,
    veiculoId: corrida.veiculoId,
    categoriaVeiculoId: corrida.categoriaVeiculoId,
    status: corrida.status,
    distanciaKm: Number(corrida.distanciaKm),
    valorKmAplicado: Number(corrida.valorKmAplicado),
    valorTotal: Number(corrida.valorTotal),
    distanciaPercorridaKm:
      corrida.distanciaPercorridaKm === null
        ? null
        : Number(corrida.distanciaPercorridaKm),
    valorFinalCobrado:
      corrida.valorFinalCobrado === null
        ? null
        : Number(corrida.valorFinalCobrado),
    dataAceite: corrida.dataAceite,
    dataInicio: corrida.dataInicio,
    dataFinalizacao: corrida.dataFinalizacao,
    dataCancelamento: corrida.dataCancelamento,
  };
}

function distanciaMetros(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const rad = Math.PI / 180;
  const dLat = (latitude2 - latitude1) * rad;
  const dLon = (longitude2 - longitude1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latitude1 * rad) *
      Math.cos(latitude2 * rad) *
      Math.sin(dLon / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export class PrismaCorridaRepository implements CorridaRepository {
  constructor(private readonly banco: typeof prisma = prisma) {}

  async criar(dados: CriarCorridaRepositoryDTO): Promise<CorridaResponseDTO> {
    // PostgreSQL detecta o conflito entre leituras do conjunto de corridas ativas
    // e inserções concorrentes. Repetir TODA a transação renova o snapshot.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.banco.$transaction(async (tx) => {
          const usuario = await tx.usuario.findFirst({
            where: { id: dados.passageiroId, ativo: true },
            select: { id: true },
          });

          if (!usuario) {
            throw new CorridaError("Passageiro não encontrado.", 404);
          }

          const ativa = await tx.corrida.findFirst({
            where: {
              passageiroId: dados.passageiroId,
              status: {
                in: ["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"],
              },
            },
            select: { id: true },
          });
          if (ativa) {
            throw new CorridaError("Passageiro já possui uma corrida ativa.", 409);
          }

          const corrida = await tx.corrida.create({
            data: {
              passageiroId: dados.passageiroId,
              categoriaVeiculoId: dados.categoriaVeiculoId,
              origemEndereco: dados.origemEndereco.trim(),
              origemLatitude: dados.origemLatitude.toFixed(7),
              origemLongitude: dados.origemLongitude.toFixed(7),
              destinoEndereco: dados.destinoEndereco.trim(),
              destinoLatitude: dados.destinoLatitude.toFixed(7),
              destinoLongitude: dados.destinoLongitude.toFixed(7),
              distanciaKm: dados.distanciaKm,
              valorKmAplicado: dados.valorKmAplicado,
              valorTotal: dados.valorTotal,
              status: "SOLICITADA",
            },
          });

          return converter(corrida);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (erro) {
        // O adapter-pg pode expor diretamente o conflito ocorrido no COMMIT.
        const causa = erro instanceof Error ? erro.cause : undefined;
        const conflitoAdapter = erro instanceof Error && erro.name === "DriverAdapterError" &&
          causa !== null && typeof causa === "object" &&
          "kind" in causa && causa.kind === "TransactionWriteConflict" &&
          "originalCode" in causa && ["40001", "40P01"].includes(String(causa.originalCode));
        const conflitoPrisma = erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034";
        if (!conflitoPrisma && !conflitoAdapter) {
          throw erro;
        }
        if (tentativa === 2) {
          throw new CorridaError(
            "Conflito ao solicitar corrida. Tente novamente.",
            409,
          );
        }
      }
    }
    throw new CorridaError("Não foi possível solicitar a corrida.", 409);
  }

  async aceitar(
    dados: AceiteCorridaRepositoryDTO,
  ): Promise<CorridaResponseDTO> {
    return this.banco.$transaction(
      async (tx) => {
        const prestador = await tx.prestador.findFirst({
          where: {
            usuarioId: dados.usuarioId,
            statusAprovacao: "APROVADO",
            usuario: { ativo: true },
          },
          select: { id: true, veiculoOnlineId: true },
        });

        if (!prestador) {
          throw new CorridaError(
            "Prestador não encontrado ou não aprovado.",
            403,
          );
        }

        if (prestador.veiculoOnlineId !== dados.veiculoId) {
          throw new CorridaError("Fique Online com o veículo informado para aceitar ofertas.", 403);
        }

        if (await tx.recusaOferta.findUnique({ where: { prestadorId_corridaId: { prestadorId: prestador.id, corridaId: dados.corridaId } } })) {
          throw new CorridaError("Oferta já recusada por este prestador.", 409);
        }

        const veiculo = await tx.veiculo.findFirst({
          where: {
            id: dados.veiculoId,
            prestadorId: prestador.id,
            ativo: true,
            statusAprovacao: "APROVADO",
            categoriaVeiculo: {
              ativo: true,
              tipoVeiculo: { ativo: true },
            },
          },
        });

        if (!veiculo) {
          throw new CorridaError(
            "Veículo não pertence ao prestador, não está aprovado ou está inativo.",
            403,
          );
        }

        const atual = await tx.corrida.findUnique({
          where: { id: dados.corridaId },
        });

        if (!atual) {
          throw new CorridaError("Corrida não encontrada.", 404);
        }

        if (atual.categoriaVeiculoId !== veiculo.categoriaVeiculoId) {
          throw new CorridaError(
            "Veículo incompatível com a categoria solicitada.",
            409,
          );
        }

        if (atual.passageiroId === dados.usuarioId) {
          throw new CorridaError(
            "O passageiro não pode aceitar a própria corrida.",
            403,
          );
        }

        const ocupado = await tx.corrida.findFirst({
          where: {
            prestadorId: prestador.id,
            status: {
              in: ["ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"],
            },
          },
          select: { id: true },
        });

        if (ocupado) {
          throw new CorridaError("Prestador já possui uma corrida ativa.", 409);
        }

        const resultado = await tx.corrida.updateMany({
          where: {
            id: dados.corridaId,
            status: "SOLICITADA",
            prestadorId: null,
          },
          data: {
            prestadorId: prestador.id,
            veiculoId: veiculo.id,
            status: "ACEITA",
            dataAceite: new Date(),
          },
        });

        if (resultado.count !== 1) {
          throw new CorridaError("Corrida já aceita ou indisponível.", 409);
        }

        const corrida = await tx.corrida.findUniqueOrThrow({
          where: { id: dados.corridaId },
        });

        return converter(corrida);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ).catch(erro => {
      if (conflitoDisponibilidade(erro)) throw new CorridaError("Conflito ao aceitar corrida ou alterar disponibilidade. Consulte novamente.", 409);
      throw erro;
    });
  }

  async iniciar(
    corridaId: string,
    usuarioId: string,
  ): Promise<CorridaResponseDTO> {
    const corrida = await this.banco.prestador.findUnique({
      where: { usuarioId },
      select: { id: true },
    });

    if (!corrida) {
      throw new CorridaError("Prestador não encontrado.", 403);
    }

    const resultado = await this.banco.corrida.updateMany({
      where: {
        id: corridaId,
        prestadorId: corrida.id,
        status: { in: ["ACEITA", "PRESTADOR_A_CAMINHO"] },
      },
      data: {
        status: "EM_ANDAMENTO",
        dataInicio: new Date(),
      },
    });

    if (resultado.count !== 1) {
      throw new CorridaError("Não é possível iniciar esta corrida.", 409);
    }

    return converter(
      await this.banco.corrida.findUniqueOrThrow({
        where: { id: corridaId },
      }),
    );
  }

  async finalizar(
    corridaId: string,
    usuarioId: string,
  ): Promise<CorridaResponseDTO> {
    const prestador = await this.banco.prestador.findUnique({
      where: { usuarioId },
      select: { id: true },
    });

    if (!prestador) {
      throw new CorridaError("Prestador não encontrado.", 403);
    }

    return this.banco.$transaction(
      async (tx) => {
        const atual = await tx.corrida.findUnique({
          where: { id: corridaId },
        });

        if (
          !atual ||
          atual.prestadorId !== prestador.id ||
          atual.status !== "EM_ANDAMENTO"
        ) {
          throw new CorridaError(
            "Corrida não está em andamento ou acesso negado.",
            409,
          );
        }

        const resultado = await tx.corrida.updateMany({
          where: {
            id: corridaId,
            prestadorId: prestador.id,
            status: "EM_ANDAMENTO",
          },
          data: {
            status: "FINALIZADA",
            valorFinalCobrado: atual.valorTotal,
            dataFinalizacao: new Date(),
          },
        });

        if (resultado.count !== 1) {
          throw new CorridaError("Corrida já encerrada.", 409);
        }

        return converter(
          await tx.corrida.findUniqueOrThrow({
            where: { id: corridaId },
          }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelar(dados: CancelarCorridaDTO): Promise<CorridaResponseDTO> {
    return this.banco.$transaction(
      async (tx) => {
        const atual = await tx.corrida.findUnique({
          where: { id: dados.corridaId },
          include: {
            prestador: { select: { usuarioId: true } },
          },
        });

        if (!atual) {
          throw new CorridaError("Corrida não encontrada.", 404);
        }

        const passageiro = atual.passageiroId === dados.usuarioId;
        const motorista = atual.prestador?.usuarioId === dados.usuarioId;

        if (!passageiro && !motorista) {
          throw new CorridaError("Acesso negado.", 403);
        }

        if (
          !["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO"].includes(
            atual.status,
          )
        ) {
          throw new CorridaError(
            "Corrida iniciada não pode ser cancelada. Utilize encerramento antecipado.",
            409,
          );
        }

        const resultado = await tx.corrida.updateMany({
          where: {
            id: dados.corridaId,
            status: atual.status,
          },
          data: {
            status: "CANCELADA",
            valorFinalCobrado: "0.00",
            dataCancelamento: new Date(),
          },
        });

        if (resultado.count !== 1) {
          throw new CorridaError("A corrida já sofreu uma alteração.", 409);
        }

        await tx.cancelamentoCorrida.create({
          data: {
            corridaId: dados.corridaId,
            usuarioId: dados.usuarioId,
            tipoResponsavel: passageiro ? "PASSAGEIRO" : "PRESTADOR",
            motivo: dados.motivo.trim(),
            descricao: dados.descricao?.trim(),
            encerramentoAntecipado: false,
          },
        });

        return converter(
          await tx.corrida.findUniqueOrThrow({
            where: { id: dados.corridaId },
          }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async encerrarAntecipadamente(
    dados: EncerrarCorridaAntecipadamenteDTO,
  ): Promise<CorridaResponseDTO> {
    return this.banco.$transaction(
      async (tx) => {
        const atual = await tx.corrida.findUnique({
          where: { id: dados.corridaId },
          include: {
            prestador: { select: { usuarioId: true } },
          },
        });

        if (!atual) {
          throw new CorridaError("Corrida não encontrada.", 404);
        }

        const passageiro = atual.passageiroId === dados.usuarioId;
        const motorista = atual.prestador?.usuarioId === dados.usuarioId;

        if (!passageiro && !motorista) {
          throw new CorridaError("Acesso negado.", 403);
        }

        if (atual.status !== "EM_ANDAMENTO" || !atual.dataInicio) {
          throw new CorridaError(
            "Somente corridas iniciadas podem ser encerradas antecipadamente.",
            409,
          );
        }

        const pontos = await tx.localizacaoCorrida.findMany({
          where: {
            corridaId: dados.corridaId,
            registradoEm: {
              gte: atual.dataInicio,
              lte: new Date(),
            },
            precisaoMetros: { lte: "30" },
          },
          orderBy: [{ registradoEm: "asc" }, { id: "asc" }],
        });

        if (pontos.length < 2) {
          throw new CorridaError(
            "Não há pontos GPS suficientes para calcular a cobrança.",
            409,
          );
        }

        let metros = 0;
        let trechosValidos = 0;

        for (let i = 1; i < pontos.length; i++) {
          const anterior = pontos[i - 1];
          const atualPonto = pontos[i];

          const segundos =
            (atualPonto.registradoEm.getTime() -
              anterior.registradoEm.getTime()) /
            1000;

          if (segundos <= 0) continue;

          const trecho = distanciaMetros(
            Number(anterior.latitude),
            Number(anterior.longitude),
            Number(atualPonto.latitude),
            Number(atualPonto.longitude),
          );

          if (trecho / segundos > 35) continue;
          if (segundos > 120) continue;

          metros += trecho;
          trechosValidos++;
        }

        if (trechosValidos === 0) {
          throw new CorridaError(
            "Percurso GPS insuficiente para calcular a cobrança.",
            409,
          );
        }

        const km = Math.round(metros) / 1000;
        const distanciaPrevista = Number(atual.distanciaKm);

        if (distanciaPrevista <= 0) {
          throw new CorridaError("Distância prevista inválida.", 409);
        }

        const proporcao = Math.min(1, km / distanciaPrevista);
        const valor =
          Math.round(Number(atual.valorTotal) * proporcao * 100) / 100;

        const resultado = await tx.corrida.updateMany({
          where: {
            id: dados.corridaId,
            status: "EM_ANDAMENTO",
          },
          data: {
            status: "ENCERRADA_ANTECIPADAMENTE",
            distanciaPercorridaKm: km.toFixed(3),
            valorFinalCobrado: valor.toFixed(2),
            dataFinalizacao: new Date(),
          },
        });

        if (resultado.count !== 1) {
          throw new CorridaError("Corrida já encerrada.", 409);
        }

        await tx.cancelamentoCorrida.create({
          data: {
            corridaId: dados.corridaId,
            usuarioId: dados.usuarioId,
            tipoResponsavel: passageiro ? "PASSAGEIRO" : "PRESTADOR",
            motivo: dados.motivo.trim(),
            descricao: dados.descricao?.trim(),
            encerramentoAntecipado: true,
          },
        });

        return converter(
          await tx.corrida.findUniqueOrThrow({
            where: { id: dados.corridaId },
          }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
