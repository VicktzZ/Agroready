/** O driver `pg` trata `sslmode=require` como `verify-full`: exige que o certificado do servidor seja de uma CA conhecida.
 *  Poolers como o do Supabase usam uma CA própria e o erro é "self-signed certificate in certificate chain".
 *  `uselibpqcompat=true` devolve a semântica do libpq (conexão criptografada, sem validar a cadeia).
 *  Esta função acrescenta o parâmetro quando falta, para o app não depender de cada ambiente (Production, Preview,
 *  local) ter a URL escrita de um jeito. URLs sem SSL (`sslmode=disable`, banco local) ficam como estão. */
export function urlDoBanco(url: string): string {
  const exigeSsl = /[?&]sslmode=(require|prefer|verify-ca)(&|$)/.test(url);
  if (!exigeSsl || /[?&]uselibpqcompat=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}uselibpqcompat=true`;
}
