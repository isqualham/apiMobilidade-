import { AutenticarUsuarioUseCase } from "./AutenticarUsuarioUseCase";
import { PrismaUsuarioRepository } from "../usuario/PrismaUsuarioRepository";

const usuarioRepository = new PrismaUsuarioRepository();

export const autenticarUsuario = new AutenticarUsuarioUseCase(
  usuarioRepository,
);
