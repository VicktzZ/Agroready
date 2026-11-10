import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CadastroDto, EntrarDto } from './auth.dto';
import type { UsuarioToken } from './auth.guard';
import { conferirSenha, gerarHash } from './senha';

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

  async cadastrar(dto: CadastroDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado.');
    const usuario = await this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, senhaHash: await gerarHash(dto.senha) },
    });
    return this.sessao(usuario);
  }

  async entrar(dto: EntrarDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    // mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta
    if (!usuario || !(await conferirSenha(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
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
