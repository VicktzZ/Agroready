import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuarioAtual } from '../auth/auth.guard';
import type { UsuarioToken } from '../auth/auth.guard';
import { ChatCarbonoDto, PropriedadeDto, SalvarCarbonoDto } from './carbono.dto';
import { CarbonoService } from './carbono.service';

@ApiTags('carbonbot')
@ApiBearerAuth()
@Controller('carbono')
export class CarbonoController {
  constructor(private readonly carbono: CarbonoService) {}

  /** Elegibilidade (checklist + score) e estimativa ilustrativa de créditos. */
  @Post('avaliar')
  @HttpCode(200)
  avaliar(@Body() dto: PropriedadeDto) {
    return this.carbono.avaliar(dto);
  }

  /** Pergunta em linguagem natural ao CarbonBot. */
  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatCarbonoDto) {
    return this.carbono.chat(dto);
  }

  /** Salva a avaliação no histórico. */
  @Post('avaliacoes')
  salvar(@UsuarioAtual() u: UsuarioToken, @Body() dto: SalvarCarbonoDto) {
    return this.carbono.salvar(u.sub, dto);
  }

  @Get('avaliacoes')
  listar(@UsuarioAtual() u: UsuarioToken) {
    return this.carbono.listar(u.sub);
  }

  @Get('avaliacoes/:id')
  buscar(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.carbono.buscar(u.sub, id);
  }

  @Delete('avaliacoes/:id')
  @HttpCode(204)
  remover(@UsuarioAtual() u: UsuarioToken, @Param('id', ParseUUIDPipe) id: string) {
    return this.carbono.remover(u.sub, id);
  }
}
