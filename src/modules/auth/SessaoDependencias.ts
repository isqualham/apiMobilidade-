import { PrismaSessaoRepository } from "./PrismaSessaoRepository";
import { SessaoUseCase } from "./SessaoUseCase";
export const sessaoUseCase = new SessaoUseCase(new PrismaSessaoRepository());
