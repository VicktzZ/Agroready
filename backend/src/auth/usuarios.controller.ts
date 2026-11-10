import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './auth.dto';
import { SoAdmin, UsuarioAtual } from './auth.guard';
import type { UsuarioToken } from './auth.guard';
import { gerarHash } from './senha';

const CAMPOS = { id: true, nome: true, email: true, papel: true, createdAt: true } as const;

/** Administração de usuários e visão geral do sistema. Só ADMIN. */
@ApiTags('usuarios')
@ApiBearerAuth()
@SoAdmin()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos os usuários (com quanto cada um já usou) + totais do sistema. */
  @Get()
  async listar() {
    const [usuarios, laudos, exportacoes, carbono, regras, termos] = await Promise.all([
      this.prisma.usuario.findMany({
        orderBy: { createdAt: 'asc' },
        select: { ...CAMPOS, _count: { select: { laudos: true, avaliacoesExportacao: true, avaliacoesCarbono: true } } },
      }),
      this.prisma.laudo.count(),
      this.prisma.avaliacaoExportacao.count(),
      this.prisma.avaliacaoCarbono.count(),
      this.prisma.regraExportacao.count(),
      this.prisma.termoNer.count(),
    ]);
    return { totais: { usuarios: usuarios.length, laudos, exportacoes, carbono, regras, termos }, usuarios };
  }

  @Post()
  async criar(@Body() dto: CriarUsuarioDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado.');
    return this.prisma.usuario.create({
      data: { nome: dto.nome.trim(), email, papel: dto.papel, senhaHash: await gerarHash(dto.senha) },
      select: CAMPOS,
    });
  }

  /** Muda nome, papel ou redefine a senha. */
  @Patch(':id')
  async atualizar(@UsuarioAtual() eu: UsuarioToken, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarUsuarioDto) {
    // ninguém tira o próprio acesso: assim sempre sobra ao menos um administrador
    if (id === eu.sub && dto.papel && dto.papel !== 'ADMIN') {
      throw new BadRequestException('Você não pode remover o seu próprio acesso de administrador.');
    }
    return this.prisma.usuario.update({
      where: { id },
      data: { nome: dto.nome?.trim(), papel: dto.papel, senhaHash: dto.senha ? await gerarHash(dto.senha) : undefined },
      select: CAMPOS,
    });
  }

  /** Exclui o usuário e tudo o que é dele (laudos e avaliações). */
  @Delete(':id')
  @HttpCode(204)
  async remover(@UsuarioAtual() eu: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    if (id === eu.sub) throw new BadRequestException('Você não pode excluir a própria conta.');
    await this.prisma.usuario.delete({ where: { id } });
  }
}
