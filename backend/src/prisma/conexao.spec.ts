import { urlDoBanco } from './conexao';

describe('urlDoBanco', () => {
  it('acrescenta uselibpqcompat quando a URL exige SSL', () => {
    expect(urlDoBanco('postgres://u:p@h:6543/postgres?sslmode=require')).toBe('postgres://u:p@h:6543/postgres?sslmode=require&uselibpqcompat=true');
    expect(urlDoBanco('postgres://u:p@h/db?pgbouncer=true&sslmode=verify-ca&x=1')).toContain('&uselibpqcompat=true');
  });

  it('não mexe em URL que já tem o parâmetro, nem em URL sem SSL', () => {
    const pronta = 'postgres://u:p@h/db?uselibpqcompat=true&sslmode=require';
    expect(urlDoBanco(pronta)).toBe(pronta);
    expect(urlDoBanco('postgres://u:p@localhost:5432/db?sslmode=disable')).toBe('postgres://u:p@localhost:5432/db?sslmode=disable');
    expect(urlDoBanco('postgres://u:p@localhost:5432/db')).toBe('postgres://u:p@localhost:5432/db');
  });

  it('é idempotente', () => {
    const uma = urlDoBanco('postgres://u:p@h/db?sslmode=require');
    expect(urlDoBanco(uma)).toBe(uma);
  });
});
