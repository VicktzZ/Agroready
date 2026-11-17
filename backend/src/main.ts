import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Atrás do proxy da Vercel, req.ip passa a ser o IP real do cliente (usado no limite de tentativas de login).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // Cabeçalhos de segurança (nosniff, HSTS, frame-options…). CSP fora: a API só devolve JSON e o Swagger usa script inline.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('AgroReady API')
    .setDescription('ExportBot + CarbonBot — NER de laudos, motor de regras e calculadora de carbono (dados ilustrativos).')
    .setVersion('1.0.0')
    .addBearerAuth() // token de POST /api/auth/entrar
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
