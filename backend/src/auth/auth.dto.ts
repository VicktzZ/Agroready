import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const PAPEIS = ['ADMIN', 'PRODUTOR'] as const;
type Papel = (typeof PAPEIS)[number];
const SENHA_CURTA = { message: 'A senha precisa ter ao menos 8 caracteres.' };

export class CadastroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(120)
  email: string;

  @IsString()
  @MinLength(8, SENHA_CURTA)
  @MaxLength(72)
  senha: string;
}

export class EntrarDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  senha: string;
}

/** Criação de conta pelo administrador (pode já nascer ADMIN). */
export class CriarUsuarioDto extends CadastroDto {
  @IsIn(PAPEIS)
  papel: Papel;
}

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsIn(PAPEIS)
  papel?: Papel;

  /** Nova senha (redefinição feita pelo administrador). */
  @IsOptional()
  @IsString()
  @MinLength(8, SENHA_CURTA)
  @MaxLength(72)
  senha?: string;
}
