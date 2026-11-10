import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Conteúdo do token de login. */
export interface UsuarioToken {
  sub: string; // id do usuário
  nome: string;
  email: string;
  papel: 'ADMIN' | 'PRODUTOR';
}

const PUBLICO = 'publico';
const SO_ADMIN = 'soAdmin';

/** Rota acessível sem login (entrar, cadastrar). */
export const Publico = () => SetMetadata(PUBLICO, true);
/** Rota (ou controller inteiro) restrita a administradores. */
export const SoAdmin = () => SetMetadata(SO_ADMIN, true);
/** Usuário do token: `@UsuarioAtual() u: UsuarioToken`. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ usuario: UsuarioToken }>().usuario,
);

/** Guard global: toda rota exige token Bearer válido, exceto as marcadas com @Publico(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvo = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLICO, alvo)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { usuario?: UsuarioToken }>();
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Faça login para continuar.');
    let dados: UsuarioToken;
    try {
      dados = await this.jwt.verifyAsync<UsuarioToken>(token);
    } catch {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }
    // Papel e existência vêm do banco, não do token: rebaixar ou excluir um usuário vale na hora.
    const atual = await this.prisma.usuario.findUnique({ where: { id: dados.sub }, select: { papel: true } });
    if (!atual) throw new UnauthorizedException('Conta não encontrada. Entre novamente.');
    req.usuario = { ...dados, papel: atual.papel };

    if (this.reflector.getAllAndOverride<boolean>(SO_ADMIN, alvo) && atual.papel !== 'ADMIN') {
      throw new ForbiddenException('Ação restrita a administradores.');
    }
    return true;
  }
}
