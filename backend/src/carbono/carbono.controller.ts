import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatCarbonoDto, PropriedadeDto } from './carbono.dto';
import { CarbonoService } from './carbono.service';

@ApiTags('carbonbot')
@Controller('carbono')
export class CarbonoController {
  constructor(private readonly carbono: CarbonoService) {}

  /** Elegibilidade (checklist + score) e estimativa ilustrativa de créditos. */
  @Post('avaliar')
  @HttpCode(200)
  avaliar(@Body() dto: PropriedadeDto) {
    return this.carbono.avaliar(dto);
  }

  /** Pergunta em linguagem natural ao CarbonBot. Resposta em HTML simples. */
  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatCarbonoDto) {
    return this.carbono.chat(dto);
  }
}
