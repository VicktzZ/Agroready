import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { TipoEntidade } from '../generated/prisma/client';

export class CreateTermoDto {
  @ApiProperty({ enum: TipoEntidade })
  @IsEnum(TipoEntidade)
  tipo: TipoEntidade;

  /** Termo como aparece no laudo; hífen casa também com espaço (ex.: "broca-do-café"). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  // menos que isso casaria com palavras comuns do laudo
  @Matches(/(?:[\p{L}\d][^\p{L}\d]*){3}/u, { message: 'O termo precisa ter ao menos 3 letras ou números.' })
  termo: string;
}

export class UpdateTermoDto extends PartialType(CreateTermoDto) {}
