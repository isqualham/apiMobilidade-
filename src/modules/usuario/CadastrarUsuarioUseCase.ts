import { gerarHashSenha } from "@/lib/passwordService";
import type { UsuarioRepository, UsuarioCriado } from "./UsuarioRepository";
import type { CadastrarUsuarioDTO } from "./CadastrarUsuarioDTO";

export class EmailJaCadastradoError extends Error {
  constructor() {
    super("Este e-mail já está cadastrado.");
    this.name = "EmailJaCadastradoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CPFJaCadastradoError extends Error {
  constructor() {
    super("Este CPF já está cadastrado.");
    this.name = "CPFJaCadastradoError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CadastrarUsuarioUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async executar(data: CadastrarUsuarioDTO): Promise<UsuarioCriado> {
    const nome = data.nome.trim();
    const cpf = data.cpf;
    const email = data.email.trim().toLowerCase();
    const telefone = data.telefone?.trim() || null;

    const cpfExiste = await this.usuarioRepository.existePorCPF(cpf);

    if (cpfExiste) {
      throw new CPFJaCadastradoError();
    }

    const emailExiste = await this.usuarioRepository.existePorEmail(email);

    if (emailExiste) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await gerarHashSenha(data.senha);

    return this.usuarioRepository.criarComAceiteTermo({
      nome,
      cpf,
      email,
      telefone,
      senhaHash,
    });
  }
}
