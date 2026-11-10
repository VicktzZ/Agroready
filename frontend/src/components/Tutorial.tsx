import { useEffect, useLayoutEffect, useState } from 'react';
import { Button, cx } from '../ui';

export interface Passo {
  /** Seletor CSS do elemento apontado; sem alvo (ou alvo fora da tela), o balão fica no centro. */
  alvo?: string;
  titulo: string;
  texto: string;
}

/** Tutorial guiado: destaca um elemento por vez e explica em um balão. Esc ou "Pular" encerra. */
export function Tutorial({ passos, rotuloFinal, onFim }: { passos: Passo[]; rotuloFinal: string; onFim: (acao: 'fim' | 'pular') => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const passo = passos[i];
  const ultimo = i === passos.length - 1;

  useLayoutEffect(() => {
    const medir = () => {
      const r = passo.alvo ? document.querySelector(passo.alvo)?.getBoundingClientRect() : undefined;
      setRect(r && r.width > 0 && r.right > 0 && r.left < window.innerWidth ? r : null); // menu fechado no celular = sem alvo
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [passo.alvo]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFim('pular');
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFim]);

  return (
    <div className="tour" role="dialog" aria-label="Tutorial">
      {rect ? (
        <div className="tour__foco" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />
      ) : (
        <div className="tour__fundo" />
      )}
      <div
        className={cx('tour__balao', !rect && 'tour__balao--centro')}
        style={rect ? { left: rect.right + 16, top: Math.max(12, Math.min(rect.top - 10, window.innerHeight - 240)) } : undefined}
      >
        <div className="row">
          <span className="badge badge--accent">
            Passo {i + 1} de {passos.length}
          </span>
        </div>
        <h3>{passo.titulo}</h3>
        <p>{passo.texto}</p>
        <div className="row entre">
          <Button variante="ghost" tamanho="sm" onClick={() => onFim('pular')}>
            Pular
          </Button>
          <div className="row">
            {i > 0 && (
              <Button variante="secondary" tamanho="sm" onClick={() => setI(i - 1)}>
                Voltar
              </Button>
            )}
            <Button tamanho="sm" autoFocus onClick={() => (ultimo ? onFim('fim') : setI(i + 1))}>
              {ultimo ? rotuloFinal : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
