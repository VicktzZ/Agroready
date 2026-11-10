import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const TAMANHO_MAXIMO_LAUDO = 50_000;

export class CreateLaudoDto {
  /** Texto integral do laudo fitossanitário. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(TAMANHO_MAXIMO_LAUDO)
  texto: string;

  /** Nome para identificar o laudo na lista (padrão: propriedade encontrada no texto). */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;
}
