import { gerarHashSenha } from "@/lib/passwordService";
import type { UsuarioRepository, UsuarioCriado } from "./UsuarioRepository";
import type { CadastrarUsuarioDTO } from "./CadastrarUsuarioDTO";

export class EmailJaCadastradoError extends Error {
  constructor() {
    super("Este e-mail já está cadastrado.");
    this.name = "EmailJaCadastradoError";
  }
}

export class CPFJaCadastradoError extends Error {
  constructor() {
    super("Este CPF já está cadastrado.");
    this.name = "CPFJaCadastradoError";
  }
}

export class TelefoneJaCadastradoError extends Error {
  constructor() {
    super("Este telefone já está cadastrado.");
    this.name = "TelefoneJaCadastradoError";
  }
}

export class CadastrarUsuarioUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async executar(data: CadastrarUsuarioDTO): Promise<UsuarioCriado> {
    const nome = data.nome.trim();
    const cpf = data.cpf;
    const email = data.email.trim().toLowerCase();
    const telefone = data.telefone?.trim() || null;

    if (await this.usuarioRepository.existePorCPF(cpf)) {
      throw new CPFJaCadastradoError();
    }

    if (await this.usuarioRepository.existePorEmail(email)) {
      throw new EmailJaCadastradoError();
    }

    if (
      telefone !== null &&
      (await this.usuarioRepository.existePorTelefone(telefone))
    ) {
      throw new TelefoneJaCadastradoError();
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
