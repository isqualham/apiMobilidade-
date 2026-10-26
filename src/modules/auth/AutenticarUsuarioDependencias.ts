import { AutenticarUsuarioUseCase } from "./AutenticarUsuarioUseCase";
import { PrismaUsuarioRepository } from "../usuario/PrismaUsuarioRepository";

import { sessaoUseCase } from "./SessaoDependencias";

const usuarioRepository = new PrismaUsuarioRepository();

export const autenticarUsuario = new AutenticarUsuarioUseCase(
  usuarioRepository,
  sessaoUseCase,
);
