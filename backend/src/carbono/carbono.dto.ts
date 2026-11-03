import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const PADROES = ['Verra VCS', 'Gold Standard'];

export class PropriedadeDto {
  /** Ex.: "cerrado" (veja GET /api/referencias). */
  @IsString()
  @IsNotEmpty()
  bioma: string;

  /** Área total da propriedade (ha). */
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  area: number;

  /** Reserva Legal atual (%). */
  @IsNumber()
  @Min(0)
  @Max(100)
  rl: number;

  /** Inscrição ativa no CAR/SICAR. */
  @IsBoolean()
  car: boolean;

  /** Houve supressão recente de vegetação nativa. */
  @IsBoolean()
  desmatamento: boolean;

  /** Ids das práticas de baixo carbono adotadas (ex.: "ilpf", "pd"). */
  @IsArray()
  @IsString({ each: true })
  praticas: string[];

  /** Possui plano de monitoramento, relato e verificação. */
  @IsBoolean()
  mrv: boolean;

  @IsIn(PADROES)
  padrao: string;
}

export class ChatCarbonoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  mensagem: string;

  @ValidateNested()
  @Type(() => PropriedadeDto)
  propriedade: PropriedadeDto;

  /** Se o produtor já clicou em "Avaliar elegibilidade". */
  @IsBoolean()
  avaliado: boolean;
}
