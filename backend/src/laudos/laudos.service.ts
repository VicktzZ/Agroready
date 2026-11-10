import { Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { Laudo, Prisma } from '../generated/prisma/client';
import { extractEntities, ResultadoNer } from '../ner/ner';
import { TermosService } from '../ner/termos.service';
import { PrismaService } from '../prisma/prisma.service';
import { TAMANHO_MAXIMO_LAUDO } from './laudo.dto';

const comEntidades = (l: Laudo) => ({ ...l, entidades: l.entidades as unknown as ResultadoNer });

/** Resumo exibido nas listas (sem o texto nem os offsets). */
export const resumoDoLaudo = (e: ResultadoNer) => ({
  entidades: e.items.length,
  culturas: e.culturas,
  pragas: e.pragas,
  doencas: e.doencas,
  talhoes: e.talhoes.length,
  ultimaInspecao: e.ultimaInspecao,
  propriedade: e.propriedade ?? null,
  local: e.local ?? null,
});

@Injectable()
export class LaudosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly termos: TermosService,
  ) {}

  /** Roda o NER sobre o texto e persiste laudo + entidades para o usuário. */
  async create(usuarioId: string, texto: string, extra: { titulo?: string; origem?: string } = {}) {
    if (texto.length > TAMANHO_MAXIMO_LAUDO) {
      throw new PayloadTooLargeException(`Laudo muito longo (máximo de ${TAMANHO_MAXIMO_LAUDO.toLocaleString('pt-BR')} caracteres).`);
    }
    const entidades = extractEntities(texto, await this.termos.dicionario());
    const laudo = await this.prisma.laudo.create({
      data: {
        usuarioId,
        texto,
        origem: extra.origem ?? 'texto',
        titulo: extra.titulo?.trim() || entidades.propriedade,
        numero: entidades.laudoNumero,
        entidades: entidades as unknown as Prisma.InputJsonValue,
      },
    });
    return comEntidades(laudo);
  }

  async findAll(usuarioId: string) {
    const laudos = await this.prisma.laudo.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        titulo: true,
        origem: true,
        numero: true,
        createdAt: true,
        entidades: true,
        _count: { select: { avaliacoes: true } },
      },
    });
    return laudos.map(({ entidades, _count, ...l }) => ({
      ...l,
      avaliacoes: _count.avaliacoes,
      resumo: resumoDoLaudo(entidades as unknown as ResultadoNer),
    }));
  }

  async findOne(usuarioId: string, id: string) {
    const laudo = await this.prisma.laudo.findFirst({ where: { id, usuarioId } });
    if (!laudo) throw new NotFoundException('Laudo não encontrado.');
    return comEntidades(laudo);
  }

  /** Roda o NER de novo com o dicionário atual (útil depois de o admin incluir termos). */
  async reprocessar(usuarioId: string, id: string) {
    const { texto } = await this.findOne(usuarioId, id);
    const entidades = extractEntities(texto, await this.termos.dicionario());
    const laudo = await this.prisma.laudo.update({
      where: { id },
      data: { numero: entidades.laudoNumero, entidades: entidades as unknown as Prisma.InputJsonValue },
    });
    return comEntidades(laudo);
  }

  async remove(usuarioId: string, id: string) {
    const { count } = await this.prisma.laudo.deleteMany({ where: { id, usuarioId } });
    if (!count) throw new NotFoundException('Laudo não encontrado.');
  }
}
