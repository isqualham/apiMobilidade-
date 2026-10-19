import { CadastrarUsuario } from "../application/use-cases/CadastrarUsuario";
import { PrismaUsuarioRepository } from "./repositories/PrismaUsuarioRepository";

const usuarioRepository = new PrismaUsuarioRepository();

export const cadastrarUsuario = new CadastrarUsuario(usuarioRepository);
