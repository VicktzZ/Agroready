import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CadastroDto, EntrarDto } from './auth.dto';
import type { UsuarioToken } from './auth.guard';
import { LimiteTentativas } from './limite-tentativas';
import { conferirSenha, gerarHash } from './senha';

/** Hash válido (sal e hash zerados) usado só para igualar o tempo quando o e-mail não existe. */
const HASH_FALSO = `${'00'.repeat(16)}:${'00'.repeat(64)}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async sessao(u: Usuario) {
    const payload: UsuarioToken = { sub: u.id, nome: u.nome, email: u.email, papel: u.papel };
    return {
      token: await this.jwt.signAsync(payload),
      usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel },
    };
  }

  // Freio contra força bruta e criação em massa de contas (ver limite-tentativas.ts sobre o alcance em serverless)
  private readonly limiteLogin = new LimiteTentativas(5, 15 * 60_000); // 5 falhas por IP+e-mail em 15 min
  private readonly limiteCadastro = new LimiteTentativas(10, 60 * 60_000); // 10 cadastros por IP em 1 h

  async cadastrar(dto: CadastroDto, ip = 'desconhecido') {
    this.limiteCadastro.verificar(ip);
    this.limiteCadastro.registrar(ip);
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado.');
    const usuario = await this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, senhaHash: await gerarHash(dto.senha) },
    });
    return this.sessao(usuario);
  }

  async entrar(dto: EntrarDto, ip = 'desconhecido') {
    const email = dto.email.trim().toLowerCase();
    const chave = `${ip}|${email}`;
    this.limiteLogin.verificar(chave);
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    // Mesma mensagem E mesmo custo para e-mail inexistente e senha errada: não revela quem tem conta
    // (sem usuário, ainda calcula um hash para o tempo de resposta não denunciar).
    const confere = await conferirSenha(dto.senha, usuario?.senhaHash ?? HASH_FALSO);
    if (!usuario || !confere) {
      this.limiteLogin.registrar(chave);
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
    this.limiteLogin.limpar(chave);
    return this.sessao(usuario);
  }

  async eu(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, papel: true },
    });
    if (!usuario) throw new UnauthorizedException('Conta não encontrada. Entre novamente.');
    return usuario;
  }
}
