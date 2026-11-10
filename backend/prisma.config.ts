import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrações pedem conexão direta. Provedores com pool (ex.: Neon pela Vercel) expõem
// DATABASE_URL_UNPOOLED; sem ela, vale a própria DATABASE_URL.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida (veja backend/.env.example).');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: { url },
});
