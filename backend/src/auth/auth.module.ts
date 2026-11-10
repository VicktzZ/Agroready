import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UsuariosController } from './usuarios.controller';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET não definido (veja backend/.env.example).');

@Module({
  imports: [JwtModule.register({ global: true, secret, signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, UsuariosController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
