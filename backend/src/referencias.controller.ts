import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PADROES } from './carbono/carbono.dto';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('referencias')
@ApiBearerAuth()
@Controller('referencias')
export class ReferenciasController {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogos usados nos formulários (destinos, culturas, biomas, práticas, padrões). */
  @Get()
  async listar() {
    const [destinos, culturas, biomas, praticas] = await Promise.all([
      this.prisma.destino.findMany({ orderBy: { nome: 'asc' } }),
      this.prisma.cultura.findMany({ orderBy: { nome: 'asc' } }),
      this.prisma.bioma.findMany({ orderBy: { nome: 'asc' } }),
      this.prisma.praticaCarbono.findMany({ orderBy: { nome: 'asc' } }),
    ]);
    return { destinos, culturas, biomas, praticas, padroes: PADROES };
  }
}
