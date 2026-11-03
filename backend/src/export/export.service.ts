import { Injectable, NotFoundException } from '@nestjs/common';
import { LaudosService } from '../laudos/laudos.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvaliarExportacaoDto, ChatExportacaoDto, CreateRegraDto, UpdateRegraDto } from './export.dto';
import { avaliarExportacao, ContextoExportacao, responderExportacao } from './export.engine';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly laudos: LaudosService,
  ) {}

  private async contexto(dto: AvaliarExportacaoDto): Promise<ContextoExportacao> {
    const regra = await this.prisma.regraExportacao.findUnique({
      where: { destinoId_culturaId: { destinoId: dto.destino, culturaId: dto.cultura } },
      include: { destino: true, cultura: true },
    });
    if (!regra) throw new NotFoundException(`Sem regra de exportação para ${dto.cultura} → ${dto.destino}.`);
    return {
      ent: dto.laudoId ? (await this.laudos.findOne(dto.laudoId)).entidades : null,
      regra,
      destino: regra.destino,
      cultura: regra.cultura,
      embarque: dto.embarque,
      docsConfirmados: dto.docsConfirmados ?? [],
    };
  }

  async avaliar(dto: AvaliarExportacaoDto) {
    return avaliarExportacao(await this.contexto(dto));
  }

  async chat(dto: ChatExportacaoDto) {
    return { resposta: responderExportacao(dto.mensagem, dto.lang ?? 'pt', await this.contexto(dto)) };
  }

  // ---- CRUD das regras destino × cultura

  listarRegras() {
    return this.prisma.regraExportacao.findMany({ orderBy: [{ destinoId: 'asc' }, { culturaId: 'asc' }] });
  }

  buscarRegra(id: number) {
    return this.prisma.regraExportacao.findUniqueOrThrow({ where: { id } });
  }

  criarRegra(dto: CreateRegraDto) {
    return this.prisma.regraExportacao.create({ data: dto });
  }

  atualizarRegra(id: number, dto: UpdateRegraDto) {
    return this.prisma.regraExportacao.update({ where: { id }, data: dto });
  }

  async removerRegra(id: number) {
    await this.prisma.regraExportacao.delete({ where: { id } });
  }
}
