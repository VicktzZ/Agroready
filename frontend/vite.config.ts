import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento o front roda em :5173 e repassa /api para o NestJS em :3000.
// Em produção o `vite build` gera frontend/dist, servido pelo próprio NestJS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
