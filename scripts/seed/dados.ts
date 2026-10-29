// UUIDs reservados à seed ViaU v1; não reutilizar para cadastros manuais.
export function idSeed(numero: number): string {
  return `b12a0000-0000-4000-8000-${String(numero).padStart(12, "0")}`;
}
function cpfSintetico(base: string): string {
  let cpf = base;
  for (const peso of [10, 11]) {
    const resto = (cpf.split("").reduce((soma, n, i) => soma + Number(n) * (peso - i), 0) * 10) % 11;
    cpf += String(resto === 10 ? 0 : resto);
  }
  return cpf;
}
export const contasSeed = [
  { nome: "Passageiro Teste 1", email: "passageiro1@teste.com.br" },
  { nome: "Passageiro Teste 2", email: "passageiro2@teste.com.br" },
  { nome: "Motorista Teste 1", email: "motorista1@teste.com.br" },
  { nome: "Motorista Teste 2", email: "motorista2@teste.com.br" },
].map((conta, i) => ({
  ...conta, id: idSeed(i + 1), cpf: cpfSintetico(`92845160${i + 1}`),
  telefone: `+556599000000${i + 1}`,
}));
export const veiculosSeed = [
  { id: idSeed(21), prestadorId: idSeed(11), usuarioId: idSeed(3), categoria: "moto" as const, placa: "VUT1A01", marca: "Honda", modelo: "CG 160", ano: 2024, cor: "Preta" },
  { id: idSeed(22), prestadorId: idSeed(12), usuarioId: idSeed(4), categoria: "economico" as const, placa: "VUT2A02", marca: "Fiat", modelo: "Argo", ano: 2024, cor: "Prata" },
];
export const tarifasSeed = {
  moto: { id: idSeed(31), valorKm: "1.80", tarifaMinima: "7.00", taxaPartida: "3.00" },
  economico: { id: idSeed(32), valorKm: "2.50", tarifaMinima: "10.00", taxaPartida: "5.00" },
  conforto: { id: idSeed(33), valorKm: "3.50", tarifaMinima: "15.00", taxaPartida: "7.00" },
  executivo: { id: idSeed(34), valorKm: "4.50", tarifaMinima: "20.00", taxaPartida: "10.00" },
};
export type PerfilCategoria = keyof typeof tarifasSeed;
export const categoriasSeed = [
  { papel: "moto", nome: "Moto", aliases: ["ViaU Moto"], tipo: "Moto", id: idSeed(41), descricao: "Transporte de passageiros por motocicleta", ativo: true },
  { papel: "economico", nome: "Carro Econômico", aliases: ["Econômico", "ViaU Econômico", "ViaU Carro Econômico"], tipo: "Carro", id: idSeed(42), descricao: "Transporte acessível por automóveis", ativo: true },
  { papel: "conforto", nome: "Carro Premium", aliases: ["Conforto", "ViaU Conforto", "Premium", "ViaU Premium", "ViaU Carro Premium"], tipo: "Carro", id: idSeed(43), descricao: "Automóveis com requisitos superiores de conforto", ativo: false },
  { papel: "executivo", nome: "Carro Porta-Malas Grande", aliases: ["Executivo", "ViaU Executivo", "Porta-Malas Grande", "ViaU Porta-Malas Grande", "ViaU Carro Porta-Malas Grande"], tipo: "Carro", id: idSeed(44), descricao: "Automóveis de padrão superior", ativo: false },
] as const;
