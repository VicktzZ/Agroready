import { Bot, ChevronDown, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { mensagemDe } from '../api';
import type { RespostaChat } from '../types';
import { Button } from '../ui';

interface Mensagem {
  id: number;
  de: 'bot' | 'user';
  texto: string;
  resposta?: RespostaChat;
  erro?: boolean;
}

/** "**negrito**" → <strong>. O backend nunca manda HTML: nada de innerHTML aqui. */
function comNegrito(texto: string): ReactNode[] {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : parte));
}

/** Como o bot entendeu a pergunta: torna o PLN visível (radicais, intenção, confiança). */
function Analise({ resposta }: { resposta: RespostaChat }) {
  const a = resposta.analise;
  return (
    <details className="analise">
      <summary>
        <ChevronDown size={13} /> Como entendi
      </summary>
      <dl>
        <dt>Intenção</dt>
        <dd>
          <code>{a.intencao ?? 'não reconhecida'}</code>{' '}
          {a.intencao === 'termo' ? 'praga ou doença citada na pergunta' : a.confianca > 0 && `${Math.round(a.confianca * 100)}% de similaridade`}
        </dd>
        {a.radicais.length > 0 && (
          <>
            <dt>Radicais</dt>
            <dd>
              {a.radicais.map((r, i) => (
                <code key={i}>{r}</code>
              ))}
            </dd>
          </>
        )}
        {a.entidades.length > 0 && (
          <>
            <dt>Entidades</dt>
            <dd>
              {a.entidades.map((e) => (
                <code key={e}>{e}</code>
              ))}
            </dd>
          </>
        )}
        {a.ranking.length > 1 && (
          <>
            <dt>Candidatas</dt>
            <dd>{a.ranking.map((r) => `${r.intencao} ${Math.round(r.score * 100)}%`).join(' · ')}</dd>
          </>
        )}
      </dl>
    </details>
  );
}

export interface ChatProps {
  nome: string;
  descricao: string;
  saudacao: string;
  sugestoes: string[];
  placeholder?: string;
  enviar: (mensagem: string) => Promise<RespostaChat>;
  /** Faz o bot responder a uma pergunta disparada pela tela (ex.: "Resumo" após avaliar). */
  disparo?: { texto: string; n: number };
}

export function Chat({ nome, descricao, saudacao, sugestoes, placeholder = 'Digite sua pergunta…', enviar, disparo }: ChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [aguardando, setAguardando] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const proximoId = useRef(1);
  const enviarAtual = useRef(enviar);
  enviarAtual.current = enviar; // sempre o contexto mais recente da tela (destino, laudo…)

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens, aguardando]);

  async function perguntar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || aguardando) return;
    const nova = (m: Omit<Mensagem, 'id'>) => setMensagens((a) => [...a, { ...m, id: proximoId.current++ }]);
    nova({ de: 'user', texto: p });
    setAguardando(true);
    try {
      const resposta = await enviarAtual.current(p);
      nova({ de: 'bot', texto: resposta.texto, resposta });
    } catch (e) {
      nova({ de: 'bot', texto: `Não consegui responder: ${mensagemDe(e)}`, erro: true });
    } finally {
      setAguardando(false);
    }
  }

  const n = disparo?.n ?? 0;
  useEffect(() => {
    if (n > 0 && disparo) void perguntar(disparo.texto);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a um novo disparo
  }, [n]);

  function aoEnviar(e: FormEvent) {
    e.preventDefault();
    void perguntar(texto);
    setTexto('');
  }

  return (
    <section className="card chat" aria-label={`Conversa com o ${nome}`}>
      <header className="chat__head">
        <span className="chat__avatar">
          <Bot size={20} />
        </span>
        <div>
          <strong>{nome}</strong>
          <small>{descricao}</small>
        </div>
      </header>

      <div className="chat__log" ref={log} role="log" aria-live="polite">
        <div className="msg msg--bot">{comNegrito(saudacao)}</div>
        {mensagens.map((m) => (
          <div key={m.id} className={`msg msg--${m.de}${m.erro ? ' msg--erro' : ''}`}>
            {m.resposta?.contexto && (
              <span className="badge badge--accent msg__ctx">
                {m.resposta.contexto.cultura} → {m.resposta.contexto.destino}
              </span>
            )}
            <div>{comNegrito(m.texto)}</div>
            {m.resposta?.itens && (
              <ul className="msg__itens">
                {m.resposta.itens.map((i) => (
                  <li key={i.id}>
                    <span className={`dot dot--${i.status}`} />
                    <span>
                      {i.label}
                      <small>{i.note}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {m.resposta && <Analise resposta={m.resposta} />}
          </div>
        ))}
        {aguardando && (
          <div className="msg msg--bot digitando" aria-label="Respondendo">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      <div className="chat__sugestoes">
        {sugestoes.map((s) => (
          <button key={s} type="button" className="chip" disabled={aguardando} onClick={() => void perguntar(s)}>
            {s}
          </button>
        ))}
      </div>
      <form className="chat__form" onSubmit={aoEnviar} autoComplete="off">
        <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} aria-label="Mensagem" maxLength={500} />
        <Button type="submit" icone={<Send size={16} />} disabled={!texto.trim()} carregando={aguardando} aria-label="Enviar" />
      </form>
    </section>
  );
}
