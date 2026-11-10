import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import type { Lang, Status } from './types';

/* Componentes-base da interface. Sem biblioteca de UI: HTML nativo + styles.css. */

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// ---- formatação
export const fmtNum = (n: number) => n.toLocaleString('pt-BR');
/** "2026-08-12" → "12/08/2026" (sem passar por Date: evita trocar o dia pelo fuso). */
export const fmtDia = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
export const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ---- botões
type Variante = 'primary' | 'secondary' | 'ghost' | 'danger';
interface Aparencia {
  variante?: Variante;
  tamanho?: 'sm' | 'md';
  icone?: ReactNode;
  bloco?: boolean;
}
const classesBtn = ({ variante = 'primary', tamanho = 'md', bloco }: Aparencia, extra?: string) =>
  cx('btn', `btn--${variante}`, tamanho === 'sm' && 'btn--sm', bloco && 'btn--bloco', extra);

export function Button({
  variante,
  tamanho,
  icone,
  bloco,
  carregando,
  className,
  disabled,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & Aparencia & { carregando?: boolean }) {
  return (
    <button type="button" {...rest} disabled={disabled || carregando} className={classesBtn({ variante, tamanho, bloco }, className)}>
      {carregando ? <LoaderCircle size={16} className="spin" /> : icone}
      {children}
    </button>
  );
}

export function LinkButton({ to, variante, tamanho, icone, bloco, className, children }: Aparencia & { to: string; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={classesBtn({ variante, tamanho, bloco }, className)}>
      {icone}
      {children}
    </Link>
  );
}

// ---- estrutura
export function PageHeader({ titulo, sub, acoes, voltar }: { titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode; voltar?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {voltar}
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {acoes && <div className="page-head__acoes">{acoes}</div>}
    </header>
  );
}

export function Card({ titulo, sub, acoes, className, children }: { titulo?: ReactNode; sub?: ReactNode; acoes?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cx('card', className)}>
      {(titulo || acoes) && (
        <div className="card__head">
          <div>
            {titulo && <h2>{titulo}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {acoes}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ rotulo, dica, erro, className, children }: { rotulo: ReactNode; dica?: ReactNode; erro?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cx('field', className)}>
      <span className="field__label">{rotulo}</span>
      {children}
      {erro ? <span className="field__erro">{erro}</span> : dica && <span className="field__dica">{dica}</span>}
    </label>
  );
}

/** Alternância entre poucas opções (Sim/Não, PT/EN). */
export function Segmentado<T extends string>({ valor, opcoes, onChange, rotulo }: { valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div className="seg" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => onChange(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ valor, abas, onChange }: { valor: T; abas: { valor: T; rotulo: string; contagem?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {abas.map((a) => (
        <button key={a.valor} type="button" role="tab" aria-selected={a.valor === valor} onClick={() => onChange(a.valor)}>
          {a.rotulo}
          {a.contagem !== undefined && <span className="badge">{a.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

// ---- estados
export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'warn' | 'erro'; children: ReactNode }) {
  const Icone = tipo === 'info' ? Info : TriangleAlert;
  return (
    <div className={cx('aviso', tipo !== 'info' && `aviso--${tipo}`)} role={tipo === 'erro' ? 'alert' : undefined}>
      <Icone size={17} />
      <div>{children}</div>
    </div>
  );
}

export function Vazio({ icone, titulo, children, acao }: { icone: ReactNode; titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <div className="vazio__ico">{icone}</div>
      <h3>{titulo}</h3>
      {children && <p>{children}</p>}
      {acao}
    </div>
  );
}

export function Carregando() {
  return (
    <div className="carregando" role="status" aria-label="Carregando">
      <LoaderCircle size={26} className="spin" />
    </div>
  );
}

/** Carregando → erro (com "tentar de novo") → conteúdo. */
export function Estado<T>({ dados, erro, carregando, recarregar, children }: { dados: T | undefined; erro: string | null; carregando: boolean; recarregar: () => void; children: (dados: T) => ReactNode }) {
  if (dados !== undefined) return <>{children(dados)}</>;
  if (carregando) return <Carregando />;
  return <Falha erro={erro} recarregar={recarregar} />;
}

export function Falha({ erro, recarregar }: { erro: string | null; recarregar: () => void }) {
  return (
    <Aviso tipo="erro">
      {erro ?? 'Não foi possível carregar.'}{' '}
      <button type="button" className="btn btn--ghost btn--sm" onClick={recarregar}>
        Tentar de novo
      </button>
    </Aviso>
  );
}

// ---- status
const ROTULO_STATUS: Record<Lang, Record<Status, string>> = {
  pt: { ok: 'Atendido', pendente: 'Pendente', risco: 'Em risco' },
  en: { ok: 'Met', pendente: 'Pending', risco: 'At risk' },
};
const ICONE_STATUS = { ok: CircleCheck, pendente: CircleAlert, risco: TriangleAlert };

export function IconeStatus({ status, size = 19 }: { status: Status; size?: number }) {
  const Icone = ICONE_STATUS[status];
  return <Icone size={size} aria-hidden />;
}

export function StatusBadge({ status, lang = 'pt', rotulo }: { status: Status; lang?: Lang; rotulo?: string }) {
  return (
    <span className={`status status--${status}`}>
      <IconeStatus status={status} size={13} />
      {rotulo ?? ROTULO_STATUS[lang][status]}
    </span>
  );
}

/** Anel de progresso (0–100%). */
export function Ring({ valor, situacao, tamanho = 96 }: { valor: number; situacao: Status; tamanho?: number }) {
  const raio = 42;
  const volta = 2 * Math.PI * raio;
  return (
    <svg className={`ring ring--${situacao}`} viewBox="0 0 100 100" width={tamanho} height={tamanho} role="img" aria-label={`${valor}% atendido`}>
      <circle cx="50" cy="50" r={raio} className="ring__trilho" />
      <circle cx="50" cy="50" r={raio} className="ring__valor" strokeDasharray={volta} strokeDashoffset={volta * (1 - valor / 100)} transform="rotate(-90 50 50)" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central">
        {valor}%
      </text>
    </svg>
  );
}

// ---- modal (dialog nativo: foco preso, Esc fecha)
export function Modal({
  aberto,
  titulo,
  onFechar,
  onSubmit,
  rodape,
  children,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  /** Se informado, corpo + rodapé viram um formulário. */
  onSubmit?: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) {
      d.showModal();
      // o dialog foca o primeiro elemento focável (o "X"); num formulário, o primeiro campo é mais útil
      d.querySelector<HTMLElement>('.modal__body :is(input, select, textarea)')?.focus();
    }
    if (!aberto && d.open) d.close();
  }, [aberto]);

  const conteudo = (
    <>
      <div className="modal__body">{aberto && children}</div>
      {rodape && <footer className="modal__foot">{rodape}</footer>}
    </>
  );
  return (
    <dialog ref={ref} className="modal" onClose={onFechar} onClick={(e) => e.target === ref.current && onFechar()}>
      <header className="modal__head">
        <h2>{titulo}</h2>
        <button type="button" className="icon-btn" onClick={onFechar} aria-label="Fechar">
          <X size={18} />
        </button>
      </header>
      {onSubmit ? (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {conteudo}
        </form>
      ) : (
        conteudo
      )}
    </dialog>
  );
}

export function Confirmar({
  aberto,
  titulo,
  children,
  rotulo = 'Excluir',
  carregando,
  onConfirmar,
  onCancelar,
}: {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  rotulo?: string;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      onFechar={onCancelar}
      rodape={
        <>
          <Button variante="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button variante="danger" onClick={onConfirmar} carregando={carregando}>
            {rotulo}
          </Button>
        </>
      }
    >
      <p>{children}</p>
    </Modal>
  );
}

// ---- avisos rápidos (toasts)
type Avisar = (tipo: 'ok' | 'erro', mensagem: string) => void;
const ToastCtx = createContext<Avisar>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<{ id: number; tipo: 'ok' | 'erro'; mensagem: string }[]>([]);
  const avisar = useCallback<Avisar>((tipo, mensagem) => {
    const id = Date.now() + Math.random();
    setItens((a) => [...a, { id, tipo, mensagem }]);
    setTimeout(() => setItens((a) => a.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`}>
            {t.tipo === 'ok' ? <CircleCheck size={18} /> : <TriangleAlert size={18} />}
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
