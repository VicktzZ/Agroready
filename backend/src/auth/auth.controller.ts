import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CadastroDto, EntrarDto } from './auth.dto';
import { Publico, UsuarioAtual } from './auth.guard';
import type { UsuarioToken } from './auth.guard';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Cria uma conta de produtor e já devolve o token. */
  @Publico()
  @Post('cadastrar')
  cadastrar(@Body() dto: CadastroDto, @Req() req: Request) {
    return this.auth.cadastrar(dto, req.ip);
  }

  @Publico()
  @Post('entrar')
  @HttpCode(200)
  entrar(@Body() dto: EntrarDto, @Req() req: Request) {
    return this.auth.entrar(dto, req.ip);
  }

  /** Dados da conta logada (valida o token guardado no navegador). */
  @ApiBearerAuth()
  @Get('eu')
  eu(@UsuarioAtual() u: UsuarioToken) {
    return this.auth.eu(u.sub);
  }
}
