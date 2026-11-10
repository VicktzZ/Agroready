import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SoAdmin, UsuarioAtual } from '../auth/auth.guard';
import type { UsuarioToken } from '../auth/auth.guard';
import { AvaliarExportacaoDto, ChatExportacaoDto, CreateRegraDto, UpdateRegraDto } from './export.dto';
import { ExportService } from './export.service';

@ApiTags('exportbot')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /** Checklist de prontidão: laudo × exigências do destino. */
  @Post('avaliar')
  @HttpCode(200)
  avaliar(@UsuarioAtual() u: UsuarioToken, @Body() dto: AvaliarExportacaoDto) {
    return this.exportService.avaliar(u.sub, dto);
  }

  /** Pergunta em linguagem natural ao ExportBot (PT/EN). */
  @Post('chat')
  @HttpCode(200)
  chat(@UsuarioAtual() u: UsuarioToken, @Body() dto: ChatExportacaoDto) {
    return this.exportService.chat(u.sub, dto);
  }

  /** Salva a avaliação no histórico (retrato em PT e EN). */
  @Post('avaliacoes')
  salvar(@UsuarioAtual() u: UsuarioToken, @Body() dto: AvaliarExportacaoDto) {
    return this.exportService.salvar(u.sub, dto);
  }

  @Get('avaliacoes')
  listarAvaliacoes(@UsuarioAtual() u: UsuarioToken) {
    return this.exportService.listarAvaliacoes(u.sub);
  }

  @Get('avaliacoes/:id')
  buscarAvaliacao(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.exportService.buscarAvaliacao(u.sub, id);
  }

  @Delete('avaliacoes/:id')
  @HttpCode(204)
  removerAvaliacao(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.exportService.removerAvaliacao(u.sub, id);
  }

  @Get('regras')
  listarRegras() {
    return this.exportService.listarRegras();
  }

  @Get('regras/:id')
  buscarRegra(@Param('id', ParseIntPipe) id: number) {
    return this.exportService.buscarRegra(id);
  }

  @SoAdmin()
  @Post('regras')
  criarRegra(@Body() dto: CreateRegraDto) {
    return this.exportService.criarRegra(dto);
  }

  @SoAdmin()
  @Patch('regras/:id')
  atualizarRegra(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegraDto) {
    return this.exportService.atualizarRegra(id, dto);
  }

  @SoAdmin()
  @Delete('regras/:id')
  @HttpCode(204)
  removerRegra(@Param('id', ParseIntPipe) id: number) {
    return this.exportService.removerRegra(id);
  }
}
