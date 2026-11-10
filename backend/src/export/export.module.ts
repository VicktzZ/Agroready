import { Module } from '@nestjs/common';
import { LaudosModule } from '../laudos/laudos.module';
import { NerModule } from '../ner/ner.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [LaudosModule, NerModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
