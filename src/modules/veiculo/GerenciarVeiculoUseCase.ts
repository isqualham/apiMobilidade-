import { z } from "zod";
import { ErroVeiculo } from "./CadastrarVeiculoDTO";
import { decisaoVeiculoSchema, editarVeiculoSchema, listaVeiculoSchema, paginaVeiculoSchema } from "./GerenciarVeiculoDTO";
import type { GestaoVeiculoRepository } from "./GestaoVeiculoRepository";
function validar<T>(schema: z.ZodType<T>, entrada: unknown): T {
  const resultado = schema.safeParse(entrada);
  if (!resultado.success) throw new ErroVeiculo("Dados ou parâmetros inválidos.");
  return resultado.data;
}
function params(consulta: URLSearchParams) {
  const dados: Record<string, string> = {};
  for (const [chave, valor] of consulta) {
    if (Object.hasOwn(dados, chave)) throw new ErroVeiculo("Parâmetro repetido.");
    Object.defineProperty(dados, chave, { value: valor, enumerable: true });
  }
  return dados;
}
export class GerenciarVeiculoUseCase {
  constructor(private readonly repository: GestaoVeiculoRepository) {}
  listar(admin: string, consulta: URLSearchParams) { return this.repository.listar(validar(z.uuid(), admin), validar(listaVeiculoSchema, params(consulta))); }
  historico(admin: string, id: string, consulta: URLSearchParams) { return this.repository.historico(validar(z.uuid(), admin), validar(z.uuid(), id), validar(paginaVeiculoSchema, params(consulta))); }
  decidir(admin: string, id: string, corpo: unknown) { return this.repository.decidir(validar(z.uuid(), admin), validar(z.uuid(), id), validar(decisaoVeiculoSchema, corpo)); }
  editar(usuario: string, id: string, corpo: unknown) { return this.repository.editar(validar(z.uuid(), usuario), validar(z.uuid(), id), validar(editarVeiculoSchema, corpo)); }
}
