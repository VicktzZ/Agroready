import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvaliarExportacaoDto, ChatExportacaoDto, CreateRegraDto, UpdateRegraDto } from './export.dto';
import { ExportService } from './export.service';

@ApiTags('exportbot')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /** Checklist de prontidão: laudo × exigências do destino. */
  @Post('avaliar')
  @HttpCode(200)
  avaliar(@Body() dto: AvaliarExportacaoDto) {
    return this.exportService.avaliar(dto);
  }

  /** Pergunta em linguagem natural ao ExportBot. Resposta em HTML simples. */
  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatExportacaoDto) {
    return this.exportService.chat(dto);
  }

  @Get('regras')
  listarRegras() {
    return this.exportService.listarRegras();
  }

  @Get('regras/:id')
  buscarRegra(@Param('id', ParseIntPipe) id: number) {
    return this.exportService.buscarRegra(id);
  }

  @Post('regras')
  criarRegra(@Body() dto: CreateRegraDto) {
    return this.exportService.criarRegra(dto);
  }

  @Patch('regras/:id')
  atualizarRegra(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegraDto) {
    return this.exportService.atualizarRegra(id, dto);
  }

  @Delete('regras/:id')
  @HttpCode(204)
  removerRegra(@Param('id', ParseIntPipe) id: number) {
    return this.exportService.removerRegra(id);
  }
}
