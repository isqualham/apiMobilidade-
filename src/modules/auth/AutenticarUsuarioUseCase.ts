import { verificarSenha } from "@/lib/passwordService";
import type { UsuarioRepository } from "../usuario/UsuarioRepository";
import type { LoginUsuarioDTO } from "../usuario/LoginUsuarioDTO";
import type { SessaoUseCase } from "./SessaoUseCase";

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
  administrador: boolean;
  prestador: boolean;
  statusAprovacao: "PENDENTE" | "APROVADO" | "REJEITADO" | null;
  telefoneVerificado: boolean;
  token: string;
  refreshToken: string;
}

export class AutenticarUsuarioUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository, private readonly sessoes: SessaoUseCase) {}

  async executar(data: LoginUsuarioDTO): Promise<UsuarioAutenticado> {
    const email = data.email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    if (!usuario) {
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await verificarSenha(data.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
    }

    if (!usuario.ativo) {
      throw new UsuarioInativoError();
    }

    const tokens = await this.sessoes.criar(usuario);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      administrador: usuario.administrador,
      prestador: usuario.prestador !== null,
      statusAprovacao: usuario.prestador?.statusAprovacao ?? null,
      telefoneVerificado: usuario.telefoneVerificado,
      ...tokens,
    };
  }
}
