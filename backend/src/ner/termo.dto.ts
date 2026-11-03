import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TipoEntidade } from '../generated/prisma/client';

export class CreateTermoDto {
  @ApiProperty({ enum: TipoEntidade })
  @IsEnum(TipoEntidade)
  tipo: TipoEntidade;

  /** Termo como aparece no laudo; hífen casa também com espaço (ex.: "broca-do-café"). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  termo: string;
}

export class UpdateTermoDto extends PartialType(CreateTermoDto) {}
