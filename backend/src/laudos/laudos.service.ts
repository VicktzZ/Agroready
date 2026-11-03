import { Injectable } from '@nestjs/common';
import type { Laudo, Prisma } from '../generated/prisma/client';
import { extractEntities, ResultadoNer } from '../ner/ner';
import { TermosService } from '../ner/termos.service';
import { PrismaService } from '../prisma/prisma.service';

const comEntidades = (l: Laudo) => ({ ...l, entidades: l.entidades as unknown as ResultadoNer });

@Injectable()
export class LaudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly termos: TermosService,
  ) {}

  /** Roda o NER sobre o texto e persiste laudo + entidades. */
  async create(texto: string) {
    const entidades = extractEntities(texto, await this.termos.dicionario());
    const laudo = await this.prisma.laudo.create({
      data: { texto, numero: entidades.laudoNumero, entidades: entidades as unknown as Prisma.InputJsonValue },
    });
    return comEntidades(laudo);
  }

  findAll() {
    return this.prisma.laudo.findMany({
      select: { id: true, numero: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string) {
    return comEntidades(await this.prisma.laudo.findUniqueOrThrow({ where: { id } }));
  }

  async remove(id: string) {
    await this.prisma.laudo.delete({ where: { id } });
  }
}
