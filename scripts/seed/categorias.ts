import type { Prisma } from "@/generated/prisma/client";
import { CadastrarTipoVeiculoUseCase } from "@/modules/tipo-veiculo/CadastrarTipoVeiculoUseCase";
import { CadastrarCategoriaVeiculoUseCase } from "@/modules/categoria-veiculo/CadastrarCategoriaVeiculoUseCase";
import { categoriasSeed, idSeed, type PerfilCategoria } from "./dados";
import { SeedError } from "./ambiente";
export type CategoriasSeed = Partial<Record<PerfilCategoria, string>>;
const normalizar = (nome: string) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

export async function resolverCategorias(tx: Prisma.TransactionClient, entrada: CategoriasSeed) {
  const ids = {} as Record<PerfilCategoria, string>;
  const resumo = [];
  const existentes = await tx.categoriaVeiculo.findMany({ include: { tipoVeiculo: true } });
  for (const definicao of categoriasSeed) {
    const { papel, nome } = definicao;
    const aliases = [nome, ...definicao.aliases].map(normalizar);
    const encontradas = existentes.filter(c => aliases.includes(normalizar(c.nome)));
    if (encontradas.length > 1) throw new SeedError(`Categorias equivalentes a ${nome} são ambíguas. Revise os relacionamentos manualmente; não haverá fusão automática.`);
    const explicita = entrada[papel] ? existentes.find(c => c.id === entrada[papel]) : undefined;
    if (entrada[papel] && !explicita) throw new SeedError(`Categoria ${papel} inexistente.`);
    if (explicita && encontradas[0] && explicita.id !== encontradas[0].id) throw new SeedError(`ID explícito conflita com categoria equivalente a ${nome}.`);
    const existente = explicita ?? encontradas[0];
    if (existente) {
      const tipo = normalizar(existente.tipoVeiculo.nome);
      if (!existente.tipoVeiculo.ativo || !(papel === "moto" ? ["moto", "motocicleta"] : ["carro", "automovel"]).includes(tipo)) throw new SeedError(`Tipo incompatível/inativo para ${nome}.`);
      // Padroniza somente aliases reconhecidos. IDs explícitos de nomes customizados são preservados.
      const renomear = aliases.includes(normalizar(existente.nome)) && existente.nome !== nome;
      if (renomear) await tx.categoriaVeiculo.update({ where: { id: existente.id }, data: { nome } });
      ids[papel] = existente.id;
      resumo.push({ id: existente.id, nome: renomear ? nome : existente.nome, ativo: existente.ativo, acao: renomear ? "renomeada" : "preservada" });
      continue;
    }
    if (await tx.categoriaVeiculo.findUnique({ where: { id: definicao.id } })) throw new SeedError("ID reservado de categoria ocupado; não será sobrescrito.");
    const tipos = await tx.tipoVeiculo.findMany({ where: { nome: { equals: definicao.tipo, mode: "insensitive" } } });
    if (tipos.length > 1 || tipos.some(t => !t.ativo)) throw new SeedError(`Tipo ${definicao.tipo} inativo/ambíguo.`);
    let tipo = tipos[0];
    if (!tipo) {
      const id = idSeed(papel === "moto" ? 51 : 52);
      if (await tx.tipoVeiculo.findUnique({ where: { id } })) throw new SeedError("ID reservado de tipo ocupado.");
      tipo = await new CadastrarTipoVeiculoUseCase({
        listarAtivos: async () => [], buscarPorNome: async () => null,
        cadastrar: async dados => tx.tipoVeiculo.create({ data: { ...dados, id } }),
      }).executar({ nome: definicao.tipo, descricao: "Tipo de desenvolvimento criado pela seed ViaU", ativo: true });
    }
    const categoria = await new CadastrarCategoriaVeiculoUseCase({
      listarAtivas: async () => [], buscarPorNome: async () => null, tipoVeiculoAtivoExiste: async () => true,
      cadastrar: async dados => tx.categoriaVeiculo.create({ data: { ...dados, id: definicao.id } }),
    }).executar({ nome, tipoVeiculoId: tipo.id, descricao: definicao.descricao, ativo: definicao.ativo, ordemExibicao: categoriasSeed.indexOf(definicao) });
    ids[papel] = categoria.id;
    resumo.push({ id: categoria.id, nome: categoria.nome, ativo: categoria.ativo, acao: "criada" });
  }
  if (new Set(Object.values(ids)).size !== categoriasSeed.length) throw new SeedError("Cada perfil tarifário precisa de uma categoria distinta.");
  return { ids, resumo };
}
