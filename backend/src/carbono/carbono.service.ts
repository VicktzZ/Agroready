import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCarbonoDto, PropriedadeDto } from './carbono.dto';
import { avaliarCarbono, responderCarbono } from './carbono.engine';

@Injectable()
export class CarbonoService {
  constructor(private readonly prisma: PrismaService) {}

  private async catalogo(p: PropriedadeDto) {
    const [bioma, praticas] = await Promise.all([
      this.prisma.bioma.findUnique({ where: { id: p.bioma } }),
      this.prisma.praticaCarbono.findMany({ orderBy: { nome: 'asc' } }),
    ]);
    if (!bioma) throw new BadRequestException(`Bioma desconhecido: ${p.bioma}`);
    const desconhecidas = p.praticas.filter((id) => !praticas.some((x) => x.id === id));
    if (desconhecidas.length) throw new BadRequestException(`Prática(s) desconhecida(s): ${desconhecidas.join(', ')}`);
    return { bioma, praticas };
  }

  async avaliar(p: PropriedadeDto) {
    const { bioma, praticas } = await this.catalogo(p);
    return avaliarCarbono(p, bioma, praticas);
  }

  async chat(dto: ChatCarbonoDto) {
    const { bioma, praticas } = await this.catalogo(dto.propriedade);
    const r = avaliarCarbono(dto.propriedade, bioma, praticas);
    return { resposta: responderCarbono(dto.mensagem, dto.propriedade, dto.avaliado, praticas, r) };
  }
}
