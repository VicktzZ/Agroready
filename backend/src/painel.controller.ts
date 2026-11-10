import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuarioAtual } from './auth/auth.guard';
import type { UsuarioToken } from './auth/auth.guard';
import type { AvaliacaoCarbono } from './carbono/carbono.engine';
import type { Resumo, Status } from './common/checklist';
import { resumoDoLaudo } from './laudos/laudos.service';
import type { ResultadoNer } from './ner/ner';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('painel')
@ApiBearerAuth()
@Controller('painel')
export class PainelController {
  constructor(private readonly prisma: PrismaService) {}

  /** Indicadores e atividade recente do usuário logado. */
  @Get()
  async painel(@UsuarioAtual() u: UsuarioToken) {
    const where = { usuarioId: u.sub };
    const recentes = { where, orderBy: { createdAt: 'desc' as const }, take: 200 };
    const [laudos, exportacoes, carbono] = await Promise.all([
      this.prisma.laudo.findMany({ ...recentes, select: { id: true, titulo: true, numero: true, origem: true, createdAt: true, entidades: true } }),
      this.prisma.avaliacaoExportacao.findMany({ ...recentes, include: { destino: true, cultura: true } }),
      this.prisma.avaliacaoCarbono.findMany(recentes),
    ]);

    // em quantos laudos cada praga/doença apareceu
    const contagem = new Map<string, { termo: string; tipo: 'PRAGA' | 'DOENCA'; laudos: number }>();
    for (const l of laudos) {
      const e = l.entidades as unknown as ResultadoNer;
      for (const [tipo, termos] of [['PRAGA', e.pragas], ['DOENCA', e.doencas]] as const) {
        for (const termo of termos) {
          const atual = contagem.get(termo) ?? { termo, tipo, laudos: 0 };
          contagem.set(termo, { ...atual, laudos: atual.laudos + 1 });
        }
      }
    }

    const situacoes: Record<Status, number> = { ok: 0, pendente: 0, risco: 0 };
    const exportacoesResumo = exportacoes.map(({ resultado, usuarioId: _, ...a }) => {
      const resumo = (resultado as unknown as { pt: { resumo: Resumo } }).pt.resumo;
      situacoes[resumo.situacao]++;
      return { ...a, resumo };
    });
    const carbonoResumo = carbono.map(({ resultado, dados: _d, usuarioId: _, ...a }) => {
      const r = resultado as unknown as AvaliacaoCarbono;
      return { ...a, resumo: r.resumo, creditosAno: r.estimativa.creditosAno };
    });

    return {
      totais: { laudos: laudos.length, exportacoes: exportacoes.length, carbono: carbono.length },
      situacoes,
      ocorrencias: [...contagem.values()].sort((a, b) => b.laudos - a.laudos || a.termo.localeCompare(b.termo)).slice(0, 6),
      recentes: {
        laudos: laudos.slice(0, 5).map(({ entidades, ...l }) => ({ ...l, resumo: resumoDoLaudo(entidades as unknown as ResultadoNer) })),
        exportacoes: exportacoesResumo.slice(0, 5),
        carbono: carbonoResumo.slice(0, 3),
      },
    };
  }
}
