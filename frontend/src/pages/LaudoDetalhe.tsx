import { ArrowLeft, RefreshCw, Ship, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, mensagemDe, useApi } from '../api';
import { ENTIDADE, LaudoTexto, Termos } from '../components/LaudoTexto';
import type { Laudo, TipoEntidade } from '../types';
import { Button, Card, Confirmar, Estado, fmtDataHora, fmtDia, fmtNum, LinkButton, PageHeader, useToast } from '../ui';
import { ORIGEM } from './Laudos';

export function LaudoDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const avisar = useToast();
  const laudo = useApi<Laudo>(`/laudos/${id}`);
  const [ocultos, setOcultos] = useState<Set<TipoEntidade>>(() => new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function reprocessar() {
    setOcupado(true);
    try {
      laudo.setDados(await api<Laudo>(`/laudos/${id}/reprocessar`, { method: 'POST' }));
      avisar('ok', 'Entidades extraídas de novo com o dicionário atual.');
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    setOcupado(true);
    try {
      await api(`/laudos/${id}`, { method: 'DELETE' });
      avisar('ok', 'Laudo excluído.');
      navegar('/laudos');
    } catch (e) {
      avisar('erro', mensagemDe(e));
      setOcupado(false);
      setConfirmando(false);
    }
  }

  const alternar = (tipo: TipoEntidade) =>
    setOcultos((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(tipo)) novo.add(tipo);
      return novo;
    });

  return (
    <Estado {...laudo}>
      {(l) => {
        const e = l.entidades;
        const tipos = (Object.keys(ENTIDADE) as TipoEntidade[]).filter((t) => e.items.some((i) => i.type === t));
        const aproximadas = e.items.filter((i) => i.aproximado).length;
        return (
          <>
            <PageHeader
              voltar={
                <Link to="/laudos" className="voltar">
                  <ArrowLeft size={15} /> Laudos
                </Link>
              }
              titulo={l.titulo ?? 'Laudo sem título'}
              sub={`${l.numero ? `Nº ${l.numero} · ` : ''}${ORIGEM[l.origem] ?? l.origem} · enviado em ${fmtDataHora(l.createdAt)}`}
              acoes={
                <>
                  <Button variante="ghost" icone={<Trash2 size={16} />} onClick={() => setConfirmando(true)}>
                    Excluir
                  </Button>
                  <Button variante="secondary" icone={<RefreshCw size={16} />} onClick={reprocessar} carregando={ocupado && !confirmando} title="Extrai as entidades de novo com o dicionário atual">
                    Reprocessar
                  </Button>
                  <LinkButton to={`/exportacao?laudo=${l.id}`} icone={<Ship size={16} />}>
                    Avaliar exportação
                  </LinkButton>
                </>
              }
            />

            <div className="split">
              <Card titulo="Texto analisado" sub={`${e.items.length} entidade(s) encontrada(s). Clique num tipo para ocultar ou mostrar.`}>
                <div className="pills">
                  {tipos.map((t) => (
                    <button key={t} type="button" className={`pill pill--ent ent--${t}`} aria-pressed={!ocultos.has(t)} onClick={() => alternar(t)}>
                      {ENTIDADE[t]} <b>{e.items.filter((i) => i.type === t).length}</b>
                    </button>
                  ))}
                </div>
                <LaudoTexto texto={l.texto} items={e.items} ocultos={ocultos} />
                <p className="muted pequeno">
                  Sublinhado tracejado: termo reconhecido por aproximação (flexão ou erro de digitação){aproximadas > 0 && ` — ${aproximadas} neste laudo`}. Riscado:
                  praga ou doença citada como ausente.
                </p>
              </Card>

              <div className="stack">
                <Card titulo="Resumo">
                  <dl className="resumo">
                    <dt>Propriedade</dt>
                    <dd>{e.propriedade ?? <span className="muted">não identificada</span>}</dd>
                    <dt>Município</dt>
                    <dd>{e.local ?? <span className="muted">não identificado</span>}</dd>
                    <dt>Nº do laudo</dt>
                    <dd>{e.laudoNumero ?? <span className="muted">não encontrado</span>}</dd>
                    <dt>Última inspeção</dt>
                    <dd>{e.ultimaInspecao ? fmtDia(e.ultimaInspecao) : <span className="muted">não identificada</span>}</dd>
                    <dt>Culturas</dt>
                    <dd>
                      <Termos tipo="CULTURA" itens={e.culturas} />
                    </dd>
                    <dt>Pragas</dt>
                    <dd>
                      <Termos tipo="PRAGA" itens={e.pragas} />
                    </dd>
                    <dt>Doenças</dt>
                    <dd>
                      <Termos tipo="DOENCA" itens={e.doencas} />
                    </dd>
                    {!!e.negadas?.length && (
                      <>
                        <dt>Ausentes</dt>
                        <dd>
                          <span className="pills">
                            {e.negadas.map((n) => (
                              <span key={n} className="pill">
                                {n}
                              </span>
                            ))}
                          </span>
                        </dd>
                      </>
                    )}
                  </dl>
                </Card>

                {!!e.talhoesDetalhe?.length && (
                  <Card titulo="Por talhão" sub="O ExportBot usa só os talhões da cultura avaliada.">
                    <ul className="lista talhoes">
                      {e.talhoesDetalhe.map((t) => (
                        <li key={t.talhao}>
                          <div className="row entre">
                            <b>Talhão {t.talhao.replace('talhão ', '')}</b>
                            <span className="muted pequeno">
                              {[t.cultura, t.areaHa !== null && `${fmtNum(t.areaHa)} ha`, t.inspecao && `inspeção em ${fmtDia(t.inspecao)}`].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                          <span className="pills">
                            <Termos tipo="PRAGA" itens={t.pragas} vazio="" />
                            <Termos tipo="DOENCA" itens={t.doencas} vazio="" />
                            {!t.pragas.length && !t.doencas.length && <span className="muted pequeno">nenhuma praga ou doença</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {e.estatisticas && (
                  <Card titulo="Processamento">
                    <div className="conta">
                      <div>
                        <b>{fmtNum(e.estatisticas.tokens)}</b>
                        <span>tokens</span>
                      </div>
                      <div>
                        <b>{fmtNum(e.estatisticas.sentencas)}</b>
                        <span>sentenças</span>
                      </div>
                      <div>
                        <b>{e.items.length}</b>
                        <span>entidades</span>
                      </div>
                      <div>
                        <b>{aproximadas}</b>
                        <span>aproximadas</span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            <Confirmar aberto={confirmando} titulo="Excluir laudo?" carregando={ocupado} onConfirmar={excluir} onCancelar={() => setConfirmando(false)}>
              O laudo e as avaliações de exportação feitas com ele serão excluídos. Esta ação não pode ser desfeita.
            </Confirmar>
          </>
        );
      }}
    </Estado>
  );
}
