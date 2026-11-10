import { useCallback, useEffect, useState } from 'react';

/* Cliente da API NestJS: mesma origem (/api), token Bearer guardado no navegador. */

const CHAVE_TOKEN = 'agroready-token';
export const SESSAO_EXPIRADA = 'agroready:sessao-expirada';

export const token = {
  get: () => localStorage.getItem(CHAVE_TOKEN),
  set: (t: string) => localStorage.setItem(CHAVE_TOKEN, t),
  clear: () => localStorage.removeItem(CHAVE_TOKEN),
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface Opcoes {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData; // upload de arquivo
}

export async function api<T>(path: string, { method, body, form }: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: method ?? (body !== undefined || form ? 'POST' : 'GET'),
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Verifique se o backend está rodando.', 0);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && t) window.dispatchEvent(new Event(SESSAO_EXPIRADA));
    const mensagem = ([] as string[]).concat(data.message ?? `Erro ${res.status}`).join(' ');
    throw new ApiError(res.status >= 500 ? 'O servidor encontrou um erro. Tente novamente.' : mensagem, res.status);
  }
  return data as T;
}

/** GET com estado de carregamento/erro. `path` nulo = não busca. Mantém os dados na recarga. */
export function useApi<T>(path: string | null) {
  const [estado, setEstado] = useState<{ chave: string | null; dados?: T; erro: string | null; carregando: boolean }>({
    chave: path,
    erro: null,
    carregando: !!path,
  });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!path) {
      setEstado({ chave: null, erro: null, carregando: false });
      return;
    }
    let ativo = true;
    setEstado((e) => ({ chave: path, dados: e.chave === path ? e.dados : undefined, erro: null, carregando: true }));
    api<T>(path).then(
      (dados) => ativo && setEstado({ chave: path, dados, erro: null, carregando: false }),
      (e: Error) => ativo && setEstado((ant) => ({ ...ant, erro: e.message, carregando: false })),
    );
    return () => {
      ativo = false;
    };
  }, [path, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const setDados = useCallback((dados: T) => setEstado((e) => ({ ...e, dados })), []);
  return { dados: estado.dados, erro: estado.erro, carregando: estado.carregando, recarregar, setDados };
}

export const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado.');
