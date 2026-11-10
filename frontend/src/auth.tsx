import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, SESSAO_EXPIRADA, token } from './api';
import type { Sessao, Usuario } from './types';

interface Auth {
  usuario: Usuario | null;
  /** Conferindo o token guardado (primeira carga). */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(() => !!token.get());

  useEffect(() => {
    if (!token.get()) return;
    api<Usuario>('/auth/eu')
      .then(setUsuario, () => token.clear())
      .finally(() => setCarregando(false));
  }, []);

  const sair = useCallback(() => {
    token.clear();
    setUsuario(null);
  }, []);

  // a API avisa quando o token deixa de valer (401)
  useEffect(() => {
    window.addEventListener(SESSAO_EXPIRADA, sair);
    return () => window.removeEventListener(SESSAO_EXPIRADA, sair);
  }, [sair]);

  const valor = useMemo<Auth>(() => {
    const abrir = (s: Sessao) => {
      token.set(s.token);
      setUsuario(s.usuario);
    };
    return {
      usuario,
      carregando,
      sair,
      entrar: async (email, senha) => abrir(await api<Sessao>('/auth/entrar', { body: { email, senha } })),
      cadastrar: async (nome, email, senha) => abrir(await api<Sessao>('/auth/cadastrar', { body: { nome, email, senha } })),
    };
  }, [usuario, carregando, sair]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
