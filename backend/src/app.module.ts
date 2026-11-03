import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { CarbonoModule } from './carbono/carbono.module';
import { ExportModule } from './export/export.module';
import { LaudosModule } from './laudos/laudos.module';
import { NerModule } from './ner/ner.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferenciasController } from './referencias.controller';

@Module({
  imports: [
    // Front-end estático (../frontend) servido na raiz; a API fica em /api.
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', '..', 'frontend'), exclude: ['/api/{*path}'] }),
    PrismaModule,
    NerModule,
    LaudosModule,
    ExportModule,
    CarbonoModule,
  ],
  controllers: [ReferenciasController],
})
export class AppModule {}
