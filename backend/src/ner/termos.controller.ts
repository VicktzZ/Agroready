import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTermoDto, UpdateTermoDto } from './termo.dto';
import { TermosService } from './termos.service';

/** Dicionário do NER (pragas, doenças, culturas). */
@ApiTags('ner')
@Controller('ner/termos')
export class TermosController {
  constructor(private readonly termos: TermosService) {}

  @Get()
  findAll() {
    return this.termos.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.termos.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTermoDto) {
    return this.termos.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTermoDto) {
    return this.termos.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.termos.remove(id);
  }
}
