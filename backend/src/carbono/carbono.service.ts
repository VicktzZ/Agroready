import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatCarbonoDto, PropriedadeDto, SalvarCarbonoDto } from './carbono.dto';
import { avaliarCarbono, AvaliacaoCarbono, responderCarbono } from './carbono.engine';

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
    const avaliacao = avaliarCarbono(dto.propriedade, bioma, praticas);
    return responderCarbono(dto.mensagem, dto.propriedade, dto.avaliado, praticas, avaliacao);
  }

  // ---- Avaliações salvas (histórico e relatório)

  async salvar(usuarioId: string, dto: SalvarCarbonoDto) {
    const { bioma, praticas } = await this.catalogo(dto.propriedade);
    const resultado = avaliarCarbono(dto.propriedade, bioma, praticas);
    // nomes junto dos ids: o relatório continua legível mesmo se o catálogo mudar depois
    const dados = {
      ...dto.propriedade,
      biomaNome: bioma.nome,
      praticasNomes: praticas.filter((x) => dto.propriedade.praticas.includes(x.id)).map((x) => x.nome),
    };
    return this.prisma.avaliacaoCarbono.create({
      data: {
        usuarioId,
        nome: dto.nome.trim(),
        dados: dados as unknown as Prisma.InputJsonValue,
        resultado: resultado as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listar(usuarioId: string) {
    const avaliacoes = await this.prisma.avaliacaoCarbono.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return avaliacoes.map(({ resultado, usuarioId: _, ...a }) => {
      const r = resultado as unknown as AvaliacaoCarbono;
      return { ...a, resumo: r.resumo, creditosAno: r.estimativa.creditosAno };
    });
  }

  async buscar(usuarioId: string, id: string) {
    const avaliacao = await this.prisma.avaliacaoCarbono.findFirst({ where: { id, usuarioId } });
    if (!avaliacao) throw new NotFoundException('Avaliação não encontrada.');
    return avaliacao;
  }

  async remover(usuarioId: string, id: string) {
    const { count } = await this.prisma.avaliacaoCarbono.deleteMany({ where: { id, usuarioId } });
    if (!count) throw new NotFoundException('Avaliação não encontrada.');
  }
}
