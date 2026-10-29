type EventoOfertas =
  | "PRESTADOR_INELEGIVEL" | "OFFLINE" | "VEICULO_DIVERGENTE"
  | "VEICULO_INELEGIVEL" | "CORRIDA_ATIVA" | "CONSULTA_CONCLUIDA"
  | "HTTP_400" | "HTTP_401" | "HTTP_403" | "HTTP_409" | "HTTP_500";

interface ResultadoDiagnostico {
  quantidade: number;
  cursorInformado: boolean;
  veiculoInformado: boolean;
  temProximaPagina: boolean;
}

// Nunca recebe Request, registros Prisma, identificadores ou objetos Error.
export function diagnosticarOfertas(evento: EventoOfertas, resultado?: ResultadoDiagnostico) {
  if (process.env.NODE_ENV !== "development" ||
      process.env.VIAU_ENVIRONMENT !== "development" ||
      process.env.VIAU_DIAGNOSTICO_OFERTAS !== "true") return;
  console.info("[ViaU:ofertas]", {
    evento,
    ...(resultado ? {
      quantidade: resultado.quantidade,
      cursorInformado: resultado.cursorInformado,
      veiculoInformado: resultado.veiculoInformado,
      temProximaPagina: resultado.temProximaPagina,
    } : {}),
  });
}
