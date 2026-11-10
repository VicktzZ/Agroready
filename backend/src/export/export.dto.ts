import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Lang } from './export.i18n';

export class AvaliarExportacaoDto {
  /** Laudo processado em POST /api/laudos. Sem laudo, os itens ficam pendentes. */
  @IsOptional()
  @IsUUID()
  laudoId?: string;

  /** Ex.: "ue", "eua", "china" (veja GET /api/referencias). */
  @IsString()
  @IsNotEmpty()
  destino: string;

  /** Ex.: "soja", "café". */
  @IsString()
  @IsNotEmpty()
  cultura: string;

  /** Data prevista de embarque (YYYY-MM-DD). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  embarque?: string;

  /** Documentos que o produtor já confirmou (texto exato do documento na regra). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  docsConfirmados?: string[];

  /** Idioma da checklist e das respostas. */
  @ApiPropertyOptional({ enum: ['pt', 'en'], default: 'pt' })
  @IsOptional()
  @IsIn(['pt', 'en'])
  lang?: Lang;
}

export class ChatExportacaoDto extends AvaliarExportacaoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  mensagem: string;
}

export class CreateRegraDto {
  @IsString()
  @IsNotEmpty()
  destinoId: string;

  @IsString()
  @IsNotEmpty()
  culturaId: string;

  /** Idade máxima (dias) da inspeção em relação ao embarque. */
  @IsInt()
  @Min(0)
  @Max(365)
  maxDias: number;

  /** Pragas/doenças (termos do dicionário) que exigem tratamento antes do embarque. */
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(80, { each: true })
  bloqueios: string[];

  /** Documentos que o produtor confirma manualmente. */
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(160, { each: true })
  docs: string[];
}

export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
