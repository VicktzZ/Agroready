export type Status = 'ok' | 'pendente' | 'risco';

export interface ItemChecklist {
  id: string;
  label: string;
  status: Status;
  note: string;
  /** Presente nos itens de documento que o produtor confirma manualmente. */
  doc?: string;
}

export interface Resumo {
  ok: number;
  pendente: number;
  risco: number;
  score: number; // % de itens atendidos
  situacao: Status; // pior status da lista
}

export function resumir(items: ItemChecklist[]): Resumo {
  const conta = (s: Status) => items.filter((i) => i.status === s).length;
  const [ok, pendente, risco] = [conta('ok'), conta('pendente'), conta('risco')];
  return {
    ok,
    pendente,
    risco,
    score: items.length ? Math.round((ok / items.length) * 100) : 0,
    situacao: risco ? 'risco' : pendente ? 'pendente' : 'ok',
  };
}

/** Resposta de um bot. `texto` aceita **negrito**; o front renderiza sem HTML cru. */
export interface RespostaChat {
  texto: string;
  itens?: ItemChecklist[];
}

/** Como a pergunta foi entendida — exibido no chat para tornar o PLN visível. */
export interface AnaliseChat {
  intencao: string | null;
  confianca: number;
  radicais: string[];
  ranking: { intencao: string; score: number }[];
  entidades: string[];
}
