import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { LaudosService, resumoDoLaudo } from '../laudos/laudos.service';
import { extractEntities, ResultadoNer } from '../ner/ner';
import { TermosService } from '../ner/termos.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvaliarExportacaoDto, ChatExportacaoDto, CreateRegraDto, UpdateRegraDto } from './export.dto';
import { avaliarExportacao, AvaliacaoExportacao, ContextoExportacao, extrairSlot, responderExportacao } from './export.engine';
import { T } from './export.i18n';

type Retrato = { pt: AvaliacaoExportacao; en: AvaliacaoExportacao };

const NOMES = { destino: true, cultura: true } as const;

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly laudos: LaudosService,
    private readonly termos: TermosService,
  ) {}

  private regra(destinoId: string, culturaId: string) {
    return this.prisma.regraExportacao.findUnique({
      where: { destinoId_culturaId: { destinoId, culturaId } },
      include: NOMES,
    });
  }

  private async contexto(usuarioId: string, dto: AvaliarExportacaoDto): Promise<ContextoExportacao> {
    const regra = await this.regra(dto.destino, dto.cultura);
    if (!regra) throw new NotFoundException(`Não há regra de exportação cadastrada para ${dto.cultura} → ${dto.destino}.`);
    return {
      ent: dto.laudoId ? (await this.laudos.findOne(usuarioId, dto.laudoId)).entidades : null,
      regra,
      destino: regra.destino,
      cultura: regra.cultura,
      embarque: dto.embarque,
      docsConfirmados: dto.docsConfirmados ?? [],
    };
  }

  async avaliar(usuarioId: string, dto: AvaliarExportacaoDto) {
    return avaliarExportacao(await this.contexto(usuarioId, dto), dto.lang ?? 'pt');
  }

  async chat(usuarioId: string, dto: ChatExportacaoDto) {
    const lang = dto.lang ?? 'pt';
    const [destinos, culturas, dicionario] = await Promise.all([
      this.prisma.destino.findMany(),
      this.prisma.cultura.findMany(),
      this.termos.dicionario(),
    ]);

    // 1) pragas/doenças citadas na pergunta ("posso exportar com ferrugem-asiática?")
    const termos = extractEntities(dto.mensagem, dicionario).items.filter((e) => e.type === 'PRAGA' || e.type === 'DOENCA');
    const citados = [...new Set(termos.map((e) => e.key))];
    // 2) destino/cultura citados ("e para a China?"), ignorando o trecho das pragas ("broca-do-café" não é a cultura café)
    let texto = dto.mensagem;
    for (const e of termos) texto = texto.slice(0, e.start) + ' '.repeat(e.end - e.start) + texto.slice(e.end);
    const d = extrairSlot(texto, destinos);
    const c = extrairSlot(d.resto, culturas);
    const destino = d.achado ?? destinos.find((x) => x.id === dto.destino);
    const cultura = c.achado ?? culturas.find((x) => x.id === dto.cultura);
    if (!destino || !cultura) throw new BadRequestException('Destino ou cultura desconhecidos.');

    const contexto = { destino: lang === 'pt' ? destino.nome : destino.nomeEn, cultura: lang === 'pt' ? cultura.nome : cultura.nomeEn };
    if (!(await this.regra(destino.id, cultura.id))) {
      return {
        texto: T[lang].chat.semRegra(contexto.cultura, contexto.destino),
        analise: { intencao: 'sem_regra', confianca: 1, radicais: [], ranking: [], entidades: citados },
        contexto,
      };
    }
    const ctx = await this.contexto(usuarioId, { ...dto, destino: destino.id, cultura: cultura.id });
    // mesma cultura em todos os destinos, para "compare os destinos"
    const regrasDaCultura = await this.prisma.regraExportacao.findMany({ where: { culturaId: cultura.id }, include: NOMES });
    const comparativo = regrasDaCultura.map((rg) => ({
      destino: lang === 'pt' ? rg.destino.nome : rg.destino.nomeEn,
      resumo: avaliarExportacao({ ...ctx, regra: rg, destino: rg.destino }, lang).resumo,
    }));
    const resposta = responderExportacao(c.resto, lang, ctx, { citados, trocouContexto: !!(d.achado || c.achado), comparativo });
    return { ...resposta, contexto };
  }

  // ---- Avaliações salvas (histórico e relatório)

  async salvar(usuarioId: string, dto: AvaliarExportacaoDto) {
    if (!dto.laudoId) throw new BadRequestException('Selecione um laudo para salvar a avaliação.');
    const ctx = await this.contexto(usuarioId, dto);
    const resultado: Retrato = { pt: avaliarExportacao(ctx, 'pt'), en: avaliarExportacao(ctx, 'en') };
    const { id } = await this.prisma.avaliacaoExportacao.create({
      data: {
        usuarioId,
        laudoId: dto.laudoId,
        destinoId: ctx.destino.id,
        culturaId: ctx.cultura.id,
        embarque: dto.embarque,
        docsConfirmados: dto.docsConfirmados ?? [],
        resultado: resultado as unknown as Prisma.InputJsonValue,
      },
    });
    return this.buscarAvaliacao(usuarioId, id);
  }

  async listarAvaliacoes(usuarioId: string) {
    const avaliacoes = await this.prisma.avaliacaoExportacao.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { ...NOMES, laudo: { select: { id: true, numero: true, titulo: true } } },
    });
    return avaliacoes.map(({ resultado, usuarioId: _, ...a }) => ({ ...a, resumo: (resultado as unknown as Retrato).pt.resumo }));
  }

  async buscarAvaliacao(usuarioId: string, id: string) {
    const a = await this.prisma.avaliacaoExportacao.findFirst({
      where: { id, usuarioId },
      include: { ...NOMES, laudo: { select: { id: true, numero: true, titulo: true, createdAt: true, entidades: true } } },
    });
    if (!a) throw new NotFoundException('Avaliação não encontrada.');
    const { entidades, ...laudo } = a.laudo;
    return {
      ...a,
      resultado: a.resultado as unknown as Retrato,
      laudo: { ...laudo, resumo: resumoDoLaudo(entidades as unknown as ResultadoNer) },
    };
  }

  async removerAvaliacao(usuarioId: string, id: string) {
    const { count } = await this.prisma.avaliacaoExportacao.deleteMany({ where: { id, usuarioId } });
    if (!count) throw new NotFoundException('Avaliação não encontrada.');
  }

  // ---- CRUD das regras destino × cultura

  listarRegras() {
    return this.prisma.regraExportacao.findMany({ orderBy: [{ destinoId: 'asc' }, { culturaId: 'asc' }], include: NOMES });
  }

  buscarRegra(id: number) {
    return this.prisma.regraExportacao.findUniqueOrThrow({ where: { id }, include: NOMES });
  }

  criarRegra(dto: CreateRegraDto) {
    return this.prisma.regraExportacao.create({ data: dto, include: NOMES });
  }

  atualizarRegra(id: number, dto: UpdateRegraDto) {
    return this.prisma.regraExportacao.update({ where: { id }, data: dto, include: NOMES });
  }

  async removerRegra(id: number) {
    await this.prisma.regraExportacao.delete({ where: { id } });
  }
}
