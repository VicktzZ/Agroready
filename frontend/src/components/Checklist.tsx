import type { ItemChecklist, Lang, Resumo } from '../types';
import { IconeStatus, Ring, StatusBadge } from '../ui';

const SITUACAO: Record<Lang, Record<Resumo['situacao'], string>> = {
  pt: { ok: 'Tudo atendido', pendente: 'Há pendências a resolver', risco: 'Há itens em risco' },
  en: { ok: 'Everything is met', pendente: 'There are pending items', risco: 'There are items at risk' },
};

/** Anel de progresso + frase-resumo da checklist. */
export function Placar({ resumo, total, lang = 'pt', unidade }: { resumo: Resumo; total: number; lang?: Lang; unidade: string }) {
  return (
    <div className="placar">
      <Ring valor={resumo.score} situacao={resumo.situacao} />
      <div>
        <h3>{SITUACAO[lang][resumo.situacao]}</h3>
        <p className="muted">
          {resumo.ok} {lang === 'pt' ? 'de' : 'of'} {total} {unidade}
          {resumo.risco > 0 && ` · ${resumo.risco} ${lang === 'pt' ? 'em risco' : 'at risk'}`}
        </p>
      </div>
    </div>
  );
}

/** Lista de exigências. Itens de documento (`doc`) viram caixa de marcar quando `onToggleDoc` é passado. */
export function Checklist({ items, lang = 'pt', onToggleDoc }: { items: ItemChecklist[]; lang?: Lang; onToggleDoc?: (doc: string, marcado: boolean) => void }) {
  return (
    <ul className="checklist">
      {items.map((i) => (
        <li key={i.id} className={i.status}>
          {i.doc && onToggleDoc ? (
            <input type="checkbox" checked={i.status === 'ok'} onChange={(e) => onToggleDoc(i.doc!, e.target.checked)} aria-label={i.label} />
          ) : (
            <IconeStatus status={i.status} />
          )}
          <div>
            <strong>{i.label}</strong>
            <small>{i.note}</small>
          </div>
          <StatusBadge status={i.status} lang={lang} />
        </li>
      ))}
    </ul>
  );
}
