import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLaudoDto {
  /** Texto integral do laudo fitossanitário. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  texto: string;
}
