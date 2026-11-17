import { HttpException } from '@nestjs/common';
import { LimiteTentativas } from './limite-tentativas';

describe('LimiteTentativas', () => {
  let t = 0;
  const limite = () => new LimiteTentativas(3, 60_000, () => t);
  beforeEach(() => (t = 1_000));

  it('deixa passar até o máximo e bloqueia a próxima com 429', () => {
    const l = limite();
    for (let i = 0; i < 3; i++) {
      l.verificar('ip|a@x.com');
      l.registrar('ip|a@x.com');
    }
    expect(() => l.verificar('ip|a@x.com')).toThrow(HttpException);
    try {
      l.verificar('ip|a@x.com');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(429);
    }
  });

  it('conta cada chave separadamente (um IP/e-mail bloqueado não afeta os outros)', () => {
    const l = limite();
    for (let i = 0; i < 3; i++) l.registrar('ip|a@x.com');
    expect(() => l.verificar('ip|a@x.com')).toThrow();
    expect(() => l.verificar('ip|b@x.com')).not.toThrow();
  });

  it('libera depois da janela', () => {
    const l = limite();
    for (let i = 0; i < 3; i++) l.registrar('k');
    expect(() => l.verificar('k')).toThrow();
    t += 60_001;
    expect(() => l.verificar('k')).not.toThrow();
  });

  it('limpar() zera a contagem (login certo)', () => {
    const l = limite();
    for (let i = 0; i < 3; i++) l.registrar('k');
    l.limpar('k');
    expect(() => l.verificar('k')).not.toThrow();
  });
});
