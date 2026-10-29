import type { CadastrarVeiculoDTO } from "./CadastrarVeiculoDTO";
import { ErroVeiculo } from "./CadastrarVeiculoDTO";
export function validarDadosVeiculo(dados: CadastrarVeiculoDTO) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
      throw new ErroVeiculo("O corpo da requisição deve ser um objeto JSON.");
    }

    if (
      typeof dados.categoriaVeiculoId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        dados.categoriaVeiculoId,
      )
    ) {
      throw new ErroVeiculo("Informe um ID válido de categoria de veículo.");
    }

    if (typeof dados.placa !== "string" || !dados.placa.trim()) {
      throw new ErroVeiculo("A placa do veículo é obrigatória.");
    }

    const placa = dados.placa.trim().toUpperCase().replace(/[\s-]/g, "");

    const placaAntiga = /^[A-Z]{3}[0-9]{4}$/;
    const placaMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

    if (!placaAntiga.test(placa) && !placaMercosul.test(placa)) {
      throw new ErroVeiculo(
        "Placa inválida. Informe uma placa brasileira válida.",
      );
    }

    if (
      typeof dados.marca !== "string" ||
      !dados.marca.trim() ||
      dados.marca.trim().length > 80
    ) {
      throw new ErroVeiculo("Informe uma marca válida com até 80 caracteres.");
    }

    if (
      typeof dados.modelo !== "string" ||
      !dados.modelo.trim() ||
      dados.modelo.trim().length > 100
    ) {
      throw new ErroVeiculo("Informe um modelo válido com até 100 caracteres.");
    }

    const anoAtual = new Date().getFullYear();

    if (
      !Number.isInteger(dados.ano) ||
      dados.ano < 1900 ||
      dados.ano > anoAtual + 1
    ) {
      throw new ErroVeiculo(`O ano deve estar entre 1900 e ${anoAtual + 1}.`);
    }

    if (
      dados.cor !== undefined &&
      dados.cor !== null &&
      (typeof dados.cor !== "string" || dados.cor.trim().length > 50)
    ) {
      throw new ErroVeiculo("A cor deve ter até 50 caracteres.");
    }

    if (dados.ativo !== undefined && typeof dados.ativo !== "boolean") {
      throw new ErroVeiculo("O campo ativo deve ser verdadeiro ou falso.");
    }

    if (dados.imagemUrl !== undefined && dados.imagemUrl !== null) {
      if (typeof dados.imagemUrl !== "string" || dados.imagemUrl.length > 500) {
        throw new ErroVeiculo("A URL da imagem deve ter até 500 caracteres.");
      }

      try {
        const url = new URL(dados.imagemUrl);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Protocolo inválido");
        }
      } catch {
        throw new ErroVeiculo(
          "Informe uma URL HTTP ou HTTPS válida para a imagem.",
        );
      }
    }

    return {
      categoriaVeiculoId: dados.categoriaVeiculoId,
      placa,
      marca: dados.marca.trim(),
      modelo: dados.modelo.trim(),
      ano: dados.ano,
      cor: typeof dados.cor === "string" ? dados.cor.trim() || null : null,
      imagemUrl: dados.imagemUrl ?? null,
      ativo: dados.ativo ?? true,
    };
}
