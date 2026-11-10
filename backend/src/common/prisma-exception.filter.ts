import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

const ERROS: Record<string, [number, string]> = {
  P2002: [HttpStatus.CONFLICT, 'Registro já existe.'],
  P2003: [HttpStatus.CONFLICT, 'Não foi possível concluir: o registro está em uso ou a referência não existe.'],
  P2025: [HttpStatus.NOT_FOUND, 'Registro não encontrado.'],
};

/** Traduz erros conhecidos do Prisma em respostas HTTP. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const [statusCode, message] = ERROS[err.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Erro interno no banco de dados.',
    ];
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(err);
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message });
  }
}
