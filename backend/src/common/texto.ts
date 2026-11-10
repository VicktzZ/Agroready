/** Remove acentos e põe em minúsculas, mantendo o MESMO comprimento da string
 *  original (os índices das entidades são reaproveitados no destaque do front). */
export function normChars(text: string): string {
  let out = '';
  // índice UTF-16 (não for...of) para preservar o comprimento mesmo com emoji
  for (let i = 0; i < text.length; i++) {
    const base = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += base.length ? base[0] : text[i];
  }
  return out;
}
