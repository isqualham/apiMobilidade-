import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { cadastrarUsuarioSchema } from "@/modules/usuario/CadastrarUsuarioDTO";
import { loginUsuarioSchema } from "@/modules/usuario/LoginUsuarioDTO";
import { gerarHashSenha, verificarSenha } from "@/lib/passwordService";
import { CadastrarVeiculoUseCase } from "@/modules/veiculo/CadastrarVeiculoUseCase";
import { contasSeed, veiculosSeed, categoriasSeed } from "./dados";
import { SeedError, validarAmbienteSeed } from "./ambiente";

import { resolverCategorias, type CategoriasSeed } from "./categorias";

import { prepararDocumentosNaTransacao } from "./documentos";

import { prepararTarifa, lerAutorizacoes } from "./tarifas";

export interface OpcoesSeed {
  env: Record<string, string | undefined>;
  senha: string;
  categorias: CategoriasSeed;
}
export async function executarSeed(banco: PrismaClient, opcoes: OpcoesSeed) {
  validarAmbienteSeed(opcoes.env);
  for (const conta of contasSeed) {
    if (!cadastrarUsuarioSchema.safeParse({ ...conta, senha: opcoes.senha, aceitouTermos: true }).success ||
        !loginUsuarioSchema.safeParse({ email: conta.email, senha: opcoes.senha }).success) {
      throw new SeedError("Dados da seed incompatíveis com cadastro/login. A senha precisa ter entre 8 e 72 caracteres.");
    }
  }
  for (const id of Object.values(opcoes.categorias)) {
    if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new SeedError("Informe IDs válidos de categorias existentes; nenhuma categoria será criada implicitamente.");
    }
  }
  const autorizacoes = lerAutorizacoes(opcoes.env.VIAU_SEED_TARIFAS_ATUALIZAR);
  const senhaHash = await gerarHashSenha(opcoes.senha);
  try {
    return await banco.$transaction(async tx => {
      await prepararDocumentosNaTransacao(tx, opcoes.env);
      const termo = await tx.termoUso.findFirst({ where: { ativo: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
      const politica = await tx.politicaPrivacidade.findFirst({ where: { ativo: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
      if (!termo || !politica) throw new SeedError("Cadastre termos de uso e política de privacidade ativos antes da seed.");
      const resolucao = await resolverCategorias(tx, opcoes.categorias);
      const idsCategorias = resolucao.ids;
      const resumoTarifas = [];
      for (const { papel } of categoriasSeed) {
        const categoria = resolucao.resumo.find(c => c.id === idsCategorias[papel])!;
        if ((papel === "moto" || papel === "economico") && !categoria.ativo) throw new SeedError(`Categoria ${papel} inativa; não será reativada.`);
        resumoTarifas.push({ categoria: categoria.nome, ...await prepararTarifa(tx, papel, categoria.id, autorizacoes) });
      }
      for (const conta of contasSeed) {
        const encontrados = await tx.usuario.findMany({ where: { OR: [
          { id: conta.id }, { email: { equals: conta.email, mode: "insensitive" } }, { cpf: conta.cpf }, { telefone: conta.telefone },
        ] } });
        if (encontrados.some(u => u.id !== conta.id || u.email !== conta.email || u.cpf !== conta.cpf || u.telefone !== conta.telefone || u.nome !== conta.nome || u.administrador)) {
          throw new SeedError(`Conflito de ID, e-mail, CPF ou telefone para ${conta.email}; nenhum registro externo será alterado.`);
        }
        const existente = encontrados[0];
        if (existente && (!existente.ativo || !await verificarSenha(opcoes.senha, existente.senhaHash))) throw new SeedError(`Conta ${conta.email} foi alterada/inativada; seed não redefine credenciais.`);
        if (!existente) await tx.usuario.create({ data: { ...conta, senhaHash, ativo: true, administrador: false, telefoneVerificado: false } });
        const aceite = await tx.aceiteTermoUso.findUnique({ where: { usuarioId_termoUsoId: { usuarioId: conta.id, termoUsoId: termo.id } } });
        if (!aceite) await tx.aceiteTermoUso.create({ data: { usuarioId: conta.id, termoUsoId: termo.id } });
        const aceitePolitica = await tx.aceitePoliticaPrivacidade.findUnique({ where: { usuarioId_politicaPrivacidadeId: { usuarioId: conta.id, politicaPrivacidadeId: politica.id } } });
        if (!aceitePolitica) await tx.aceitePoliticaPrivacidade.create({ data: { usuarioId: conta.id, politicaPrivacidadeId: politica.id } });
        const prestador = await tx.prestador.findUnique({ where: { usuarioId: conta.id } });
        if (!veiculosSeed.some(v => v.usuarioId === conta.id) && prestador) throw new SeedError("Passageiro da seed possui cadastro inesperado de prestador.");
      }
      for (const dados of veiculosSeed) {
        const prestador = await tx.prestador.findFirst({ where: { OR: [{ id: dados.prestadorId }, { usuarioId: dados.usuarioId }] } });
        if (prestador && (prestador.id !== dados.prestadorId || prestador.usuarioId !== dados.usuarioId || prestador.statusAprovacao !== "APROVADO")) throw new SeedError("Cadastro de prestador conflitante ou aprovação alterada; nada será sobrescrito.");
        if (!prestador) await tx.prestador.create({ data: { id: dados.prestadorId, usuarioId: dados.usuarioId, statusAprovacao: "APROVADO" } });
        const categoriaVeiculoId = idsCategorias[dados.categoria];
        const veiculos = await tx.veiculo.findMany({ where: { OR: [{ id: dados.id }, { placa: { equals: dados.placa, mode: "insensitive" } }, { prestadorId: dados.prestadorId }] } });
        if (veiculos.some(v => v.id !== dados.id || v.prestadorId !== dados.prestadorId || v.placa !== dados.placa || v.categoriaVeiculoId !== categoriaVeiculoId || !v.ativo || v.marca !== dados.marca || v.modelo !== dados.modelo || v.ano !== dados.ano || v.cor !== dados.cor)) throw new SeedError(`Conflito de veículo/placa ${dados.placa}; não será sobrescrito.`);
        if (!veiculos.length) await new CadastrarVeiculoUseCase({
          listarPorPrestador: async () => [], buscarPorPlaca: async () => null,
          verificarCategoriaAtiva: async () => true,
          cadastrar: async (prestadorId, entrada) => tx.veiculo.create({ data: { ...entrada, id: dados.id, prestadorId } }),
        }).executar(dados.prestadorId, { categoriaVeiculoId, placa: dados.placa, marca: dados.marca, modelo: dados.modelo, ano: dados.ano, cor: dados.cor, ativo: true });
      }
      const ativas = await tx.corrida.count({ where: { status: { in: ["SOLICITADA", "ACEITA", "PRESTADOR_A_CAMINHO", "EM_ANDAMENTO"] }, OR: [
        { passageiroId: { in: contasSeed.map(c => c.id) } }, { prestadorId: { in: veiculosSeed.map(v => v.prestadorId) } },
      ] } });
      return { categorias: resolucao.resumo, contas: contasSeed.map(({ id, email }) => ({ id, email })), tarifas: resumoTarifas, corridasAtivasExistentes: ativas };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  } catch (erro) {
    if (erro instanceof SeedError) throw erro;
    if (erro instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(erro.code)) throw new SeedError("Conflito de unicidade ou execução concorrente. A transação foi revertida; confira os cadastros e tente novamente.");
    // Exceções Prisma podem incluir parâmetros; não propagar para o logger da CLI.
    throw new SeedError("Seed não aplicada: falha de validação ou banco. Confira migrations, categorias e conexão; nenhum dado parcial foi confirmado.");
  }
}
