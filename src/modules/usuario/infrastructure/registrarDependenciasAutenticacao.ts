import { AutenticarUsuario } from "../application/use-cases/AutenticarUsuario";
import { PrismaUsuarioRepository } from "./repositories/PrismaUsuarioRepository";

const usuarioRepository = new PrismaUsuarioRepository();

export const autenticarUsuario = new AutenticarUsuario(usuarioRepository);
