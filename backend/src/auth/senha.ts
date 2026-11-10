import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derivar = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

/** Hash de senha com scrypt + sal aleatório, no formato "salHex:hashHex". */
export async function gerarHash(senha: string): Promise<string> {
  const sal = randomBytes(16);
  return `${sal.toString('hex')}:${(await derivar(senha, sal, 64)).toString('hex')}`;
}

export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const [sal, hash] = armazenado.split(':');
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = await derivar(senha, Buffer.from(sal, 'hex'), esperado.length || 64);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
