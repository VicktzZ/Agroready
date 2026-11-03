import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL não definida (veja backend/.env.example).');
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  onModuleDestroy() {
    return this.$disconnect();
  }
}
