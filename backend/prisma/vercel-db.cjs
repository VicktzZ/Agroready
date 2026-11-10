// Roda antes do `npm run build` (script prebuild). Na Vercel, que define VERCEL=1 no build,
// aplica as migrações e o seed no banco ligado ao projeto; na sua máquina não faz nada.
// A Vercel Services só executa o `build` do serviço, por isso não dá para usar `vercel-build`.
const { execSync } = require('node:child_process');

if (process.env.VERCEL) {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync('npx prisma db seed', { stdio: 'inherit' });
}
