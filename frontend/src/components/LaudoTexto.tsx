import type { ReactNode } from 'react';
import type { Entidade, TipoEntidade } from '../types';
import { cx } from '../ui';

export const ENTIDADE: Record<TipoEntidade, string> = {
  PRAGA: 'Praga',
  DOENCA: 'Doença',
  CULTURA: 'Cultura',
  TALHAO: 'Talhão',
  DATA: 'Data',
  AREA: 'Área',
  LAUDO: 'Nº do laudo',
  PROPRIEDADE: 'Propriedade',
  LOCAL: 'Município',
};

/** Etiqueta colorida de um termo (praga, doença, cultura…). */
export function Termo({ tipo, children }: { tipo: TipoEntidade; children: ReactNode }) {
  return <span className={`pill pill--ent ent--${tipo}`}>{children}</span>;
}

export function Termos({ tipo, itens, vazio = 'nenhuma' }: { tipo: TipoEntidade; itens: string[]; vazio?: string }) {
  if (!itens.length) return <span className="muted">{vazio}</span>;
  return (
    <span className="pills">
      {itens.map((t) => (
        <Termo key={t} tipo={tipo}>
          {t}
        </Termo>
      ))}
    </span>
  );
}

const explicar = (e: Entidade) =>
  [ENTIDADE[e.type], e.negada && 'citada como ausente', e.aproximado && `aproximado de “${e.key}”`, e.talhao].filter(Boolean).join(' · ');

/** Texto do laudo com as entidades do NER destacadas pelos offsets devolvidos pela API. */
export function LaudoTexto({ texto, items, ocultos }: { texto: string; items: Entidade[]; ocultos: Set<TipoEntidade> }) {
  const partes: ReactNode[] = [];
  let pos = 0;
  for (const e of items) {
    if (ocultos.has(e.type) || e.start < pos) continue;
    partes.push(texto.slice(pos, e.start));
    partes.push(
      <mark key={e.start} className={cx('ent', `ent--${e.type}`, e.aproximado && 'ent--aprox', e.negada && 'ent--negada')} title={explicar(e)}>
        {texto.slice(e.start, e.end)}
      </mark>,
    );
    pos = e.end;
  }
  partes.push(texto.slice(pos));
  return <div className="laudo-texto">{partes}</div>;
}
