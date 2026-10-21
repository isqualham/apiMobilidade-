import { CadastrarUsuarioUseCase } from "./CadastrarUsuarioUseCase";
import { PrismaUsuarioRepository } from "./PrismaUsuarioRepository";

const usuarioRepository = new PrismaUsuarioRepository();

export const cadastrarUsuario = new CadastrarUsuarioUseCase(usuarioRepository);
