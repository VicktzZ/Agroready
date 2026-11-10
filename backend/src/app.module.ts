import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { CarbonoModule } from './carbono/carbono.module';
import { BiomasController, CulturasController, DestinosController, PraticasController } from './catalogo.controller';
import { ExportModule } from './export/export.module';
import { LaudosModule } from './laudos/laudos.module';
import { NerModule } from './ner/ner.module';
import { PainelController } from './painel.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ReferenciasController } from './referencias.controller';

// Build do front (frontend/dist). Em desenvolvimento ele não existe: o Vite serve o front em :5173.
const FRONT = join(__dirname, '..', '..', 'frontend', 'dist');

@Module({
  imports: [
    ...(existsSync(FRONT) ? [ServeStaticModule.forRoot({ rootPath: FRONT, exclude: ['/api/{*path}'] })] : []),
    PrismaModule,
    AuthModule,
    NerModule,
    LaudosModule,
    ExportModule,
    CarbonoModule,
  ],
  controllers: [
    ReferenciasController,
    PainelController,
    DestinosController,
    CulturasController,
    BiomasController,
    PraticasController,
  ],
})
export class AppModule {}
