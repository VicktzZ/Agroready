import { Module } from '@nestjs/common';
import { NerModule } from '../ner/ner.module';
import { LaudosController } from './laudos.controller';
import { LaudosService } from './laudos.service';

@Module({
  imports: [NerModule],
  controllers: [LaudosController],
  providers: [LaudosService],
  exports: [LaudosService],
})
export class LaudosModule {}
