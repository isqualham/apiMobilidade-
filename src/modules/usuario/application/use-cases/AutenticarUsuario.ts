import { compare } from "bcryptjs";
import type { UsuarioRepository } from "../../domain/repositories/UsuarioRepository";
import type { LoginUsuarioDTO } from "../dtos/LoginUsuarioSchema";
import { gerarToken } from "../../infrastructure/cryptography/TokenService";

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super("E-mail ou senha inválidos.");
    this.name = "CredenciaisInvalidasError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UsuarioInativoError extends Error {
  constructor() {
    super("Usuário inativo.");
    this.name = "UsuarioInativoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  token: string;
}

export class AutenticarUsuario {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async executar(data: LoginUsuarioDTO): Promise<UsuarioAutenticado> {
    const email = data.email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    if (!usuario) {
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await compare(data.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
    }

    if (!usuario.ativo) {
      throw new UsuarioInativoError();
    }

    const token = await gerarToken({
      sub: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    });

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      token,
    };
  }
}
