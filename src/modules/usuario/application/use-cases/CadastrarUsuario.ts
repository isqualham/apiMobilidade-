import { hash } from "bcryptjs";
import type {
  UsuarioRepository,
  UsuarioCriado,
} from "../../domain/repositories/UsuarioRepository";
import type { CadastrarUsuarioDTO } from "../dtos/CadastrarUsuarioSchema";

export class EmailJaCadastradoError extends Error {
  constructor() {
    super("Este e-mail já está cadastrado.");
    this.name = "EmailJaCadastradoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CadastrarUsuario {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async executar(data: CadastrarUsuarioDTO): Promise<UsuarioCriado> {
    const nome = data.nome.trim();
    const email = data.email.trim().toLowerCase();
    const telefone = data.telefone?.trim() || null;

    const existe = await this.usuarioRepository.existePorEmail(email);

    if (existe) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await hash(data.senha, 12);

    return this.usuarioRepository.criar({
      nome,
      email,
      telefone,
      senhaHash,
    });
  }
}
