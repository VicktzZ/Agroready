import { Module } from '@nestjs/common';
import { LaudosModule } from '../laudos/laudos.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [LaudosModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
