import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UsuarioAtual } from '../auth/auth.guard';
import type { UsuarioToken } from '../auth/auth.guard';
import { extrairTexto, nomeDoArquivo } from './arquivo';
import type { ArquivoEnviado } from './arquivo';
import { CreateLaudoDto } from './laudo.dto';
import { LaudosService } from './laudos.service';

@ApiTags('laudos')
@ApiBearerAuth()
@Controller('laudos')
export class LaudosController {
  constructor(private readonly laudos: LaudosService) {}

  /** Processa o texto do laudo com o NER e salva o resultado. */
  @Post()
  create(@UsuarioAtual() u: UsuarioToken, @Body() dto: CreateLaudoDto) {
    return this.laudos.create(u.sub, dto.texto, { titulo: dto.titulo });
  }

  /** Envia um .txt ou PDF com texto selecionável (campo "arquivo", até 4 MB — a Vercel recusa corpos acima de 4,5 MB). */
  @Post('arquivo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 4 * 1024 * 1024 } }))
  async upload(@UsuarioAtual() u: UsuarioToken, @UploadedFile() arquivo?: ArquivoEnviado) {
    if (!arquivo) throw new BadRequestException('Envie o arquivo no campo "arquivo".');
    const { texto, origem } = await extrairTexto(arquivo);
    return this.laudos.create(u.sub, texto, { titulo: nomeDoArquivo(arquivo), origem });
  }

  /** Laudos do usuário, do mais recente ao mais antigo (sem o texto). */
  @Get()
  findAll(@UsuarioAtual() u: UsuarioToken) {
    return this.laudos.findAll(u.sub);
  }

  @Get(':id')
  findOne(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.laudos.findOne(u.sub, id);
  }

  /** Extrai as entidades de novo usando o dicionário atual. */
  @Post(':id/reprocessar')
  @HttpCode(200)
  reprocessar(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.laudos.reprocessar(u.sub, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.laudos.remove(u.sub, id);
  }
}
