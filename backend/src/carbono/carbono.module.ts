import { Module } from '@nestjs/common';
import { CarbonoController } from './carbono.controller';
import { CarbonoService } from './carbono.service';

@Module({
  controllers: [CarbonoController],
  providers: [CarbonoService],
})
export class CarbonoModule {}
