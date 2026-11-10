import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SoAdmin } from './auth/auth.guard';
import {
  BiomaDto,
  CulturaDto,
  DestinoDto,
  PraticaDto,
  UpdateBiomaDto,
  UpdateCulturaDto,
  UpdateDestinoDto,
  UpdatePraticaDto,
} from './catalogo.dto';
import { normChars } from './common/texto';
import { PrismaService } from './prisma/prisma.service';

/* Catálogos mantidos pelo administrador. Leitura para qualquer usuário logado;
   criar, editar e remover só para ADMIN. O id é gerado a partir do nome. */

/** "União Europeia" → "uniao-europeia" */
const slug = (nome: string) =>
  normChars(nome)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const USO = { _count: { select: { regras: true } } };

@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/destinos')
export class DestinosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.destino.findMany({ orderBy: { nome: 'asc' }, include: USO });
  }

  @SoAdmin()
  @Post()
  criar(@Body() dto: DestinoDto) {
    return this.prisma.destino.create({ data: { id: slug(dto.nome), ...dto }, include: USO });
  }

  @SoAdmin()
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateDestinoDto) {
    return this.prisma.destino.update({ where: { id }, data: dto, include: USO });
  }

  @SoAdmin()
  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string) {
    await this.prisma.destino.delete({ where: { id } });
  }
}

@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/culturas')
export class CulturasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.cultura.findMany({ orderBy: { nome: 'asc' }, include: USO });
  }

  /** Cria a cultura e garante o termo correspondente no dicionário do NER. */
  @SoAdmin()
  @Post()
  async criar(@Body() dto: CulturaDto) {
    const termo = dto.nome.trim().toLowerCase();
    const [cultura] = await this.prisma.$transaction([
      this.prisma.cultura.create({ data: { id: slug(dto.nome), ...dto }, include: USO }),
      this.prisma.termoNer.upsert({ where: { termo }, create: { tipo: 'CULTURA', termo }, update: {} }),
    ]);
    return cultura;
  }

  @SoAdmin()
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateCulturaDto) {
    return this.prisma.cultura.update({ where: { id }, data: dto, include: USO });
  }

  @SoAdmin()
  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string) {
    await this.prisma.cultura.delete({ where: { id } });
  }
}

@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/biomas')
export class BiomasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.bioma.findMany({ orderBy: { nome: 'asc' } });
  }

  @SoAdmin()
  @Post()
  criar(@Body() dto: BiomaDto) {
    return this.prisma.bioma.create({ data: { id: slug(dto.nome), ...dto } });
  }

  @SoAdmin()
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateBiomaDto) {
    return this.prisma.bioma.update({ where: { id }, data: dto });
  }

  @SoAdmin()
  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string) {
    await this.prisma.bioma.delete({ where: { id } });
  }
}

@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('catalogo/praticas')
export class PraticasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.praticaCarbono.findMany({ orderBy: { nome: 'asc' } });
  }

  @SoAdmin()
  @Post()
  criar(@Body() dto: PraticaDto) {
    return this.prisma.praticaCarbono.create({ data: { id: slug(dto.nome), ...dto } });
  }

  @SoAdmin()
  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdatePraticaDto) {
    return this.prisma.praticaCarbono.update({ where: { id }, data: dto });
  }

  @SoAdmin()
  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string) {
    await this.prisma.praticaCarbono.delete({ where: { id } });
  }
}
