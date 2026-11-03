import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateLaudoDto } from './laudo.dto';
import { LaudosService } from './laudos.service';

@ApiTags('laudos')
@Controller('laudos')
export class LaudosController {
  constructor(private readonly laudos: LaudosService) {}

  /** Processa o laudo com o NER e salva o resultado. */
  @Post()
  create(@Body() dto: CreateLaudoDto) {
    return this.laudos.create(dto.texto);
  }

  /** Últimos 50 laudos (sem texto). */
  @Get()
  findAll() {
    return this.laudos.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.laudos.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.laudos.remove(id);
  }
}
