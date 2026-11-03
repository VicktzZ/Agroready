import { escapeHtml } from './texto';

export type Status = 'ok' | 'pendente' | 'risco';

export interface ItemChecklist {
  id: string;
  label: string;
  status: Status;
  note: string;
  /** Presente nos itens de documento que o produtor confirma manualmente. */
  doc?: string;
}

export const htmlLista = (items: ItemChecklist[]) =>
  `<ul>${items.map((i) => `<li>${escapeHtml(i.label)} — <small>${escapeHtml(i.note)}</small></li>`).join('')}</ul>`;
