import { PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const COM_LETRA = /[\p{L}\d]/u;
const SEM_LETRA = { message: 'O nome precisa ter ao menos uma letra ou número.' };

export class DestinoDto {
  @IsString()
  @Matches(COM_LETRA, SEM_LETRA)
  @MaxLength(80)
  nome: string;

  /** Nome em inglês, usado nas respostas e relatórios em EN. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nomeEn: string;
}
export class UpdateDestinoDto extends PartialType(DestinoDto) {}

export class CulturaDto extends DestinoDto {}
export class UpdateCulturaDto extends PartialType(CulturaDto) {}

export class BiomaDto {
  @IsString()
  @Matches(COM_LETRA, SEM_LETRA)
  @MaxLength(80)
  nome: string;

  /** % mínimo de Reserva Legal no bioma. */
  @IsInt()
  @Min(0)
  @Max(100)
  reservaLegalMin: number;
}
export class UpdateBiomaDto extends PartialType(BiomaDto) {}

export class PraticaDto {
  @IsString()
  @Matches(COM_LETRA, SEM_LETRA)
  @MaxLength(120)
  nome: string;

  /** Fator de remoção/redução em tCO2e por hectare por ano. */
  @IsNumber()
  @Min(0)
  @Max(100)
  fatorTco2eHaAno: number;
}
export class UpdatePraticaDto extends PartialType(PraticaDto) {}
