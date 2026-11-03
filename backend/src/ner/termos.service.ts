import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Dicionario } from './ner';
import { CreateTermoDto, UpdateTermoDto } from './termo.dto';

const normTermo = (s: string) => s.trim().toLowerCase();

@Injectable()
export class TermosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.termoNer.findMany({ orderBy: [{ tipo: 'asc' }, { termo: 'asc' }] });
  }

  findOne(id: number) {
    return this.prisma.termoNer.findUniqueOrThrow({ where: { id } });
  }

  create(dto: CreateTermoDto) {
    return this.prisma.termoNer.create({ data: { ...dto, termo: normTermo(dto.termo) } });
  }

  update(id: number, dto: UpdateTermoDto) {
    return this.prisma.termoNer.update({
      where: { id },
      data: { ...dto, termo: dto.termo && normTermo(dto.termo) },
    });
  }

  remove(id: number) {
    return this.prisma.termoNer.delete({ where: { id } });
  }

  /** Dicionário agrupado por tipo, no formato consumido por extractEntities(). */
  async dicionario(): Promise<Dicionario> {
    const dict: Dicionario = { PRAGA: [], DOENCA: [], CULTURA: [] };
    for (const t of await this.findAll()) dict[t.tipo].push(t.termo);
    return dict;
  }
}
