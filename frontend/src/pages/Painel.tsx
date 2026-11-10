import { FileText, Leaf, Plus, Ship, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api';
import { useAuth } from '../auth';
import type { Painel as PainelDados, Status } from '../types';
import { Card, cx, Estado, fmtDataHora, fmtNum, LinkButton, PageHeader, StatusBadge, Vazio } from '../ui';

const SITUACOES: { status: Status; rotulo: string; cor: string }[] = [
  { status: 'ok', rotulo: 'Prontas', cor: 'var(--ok)' },
  { status: 'pendente', rotulo: 'Com pendências', cor: 'var(--warn)' },
  { status: 'risco', rotulo: 'Em risco', cor: 'var(--danger)' },
];

function Kpi({ icone, valor, rotulo, accent }: { icone: ReactNode; valor: ReactNode; rotulo: string; accent?: boolean }) {
  return (
    <div className="card kpi">
      <span className={cx('kpi__ico', accent && 'kpi__ico--accent')}>{icone}</span>
      <div>
        <div className="kpi__valor">{valor}</div>
        <div className="kpi__rotulo">{rotulo}</div>
      </div>
    </div>
  );
}

/** Primeira visita: ainda não há laudo. */
function BoasVindas() {
  return (
    <>
      <section className="card hero">
        <div className="row">
          <span className="badge badge--accent">Comece por aqui</span>
        </div>
        <h1>Envie o primeiro laudo</h1>
        <p>
          O AgroReady lê o laudo fitossanitário, identifica pragas, doenças, talhões e datas e usa essas informações para checar a
          exportação e a elegibilidade a créditos de carbono.
        </p>
        <div className="row">
          <LinkButton to="/laudos/novo" icone={<Plus size={17} />}>
            Enviar laudo
          </LinkButton>
          <LinkButton to="/sobre" variante="secondary">
            Como funciona
          </LinkButton>
        </div>
      </section>
      <div className="passos">
        <Link to="/laudos/novo" className="card passo">
          <span className="passo__n">1</span>
          <h3>Envie o laudo</h3>
          <p>Cole o texto ou envie um .txt ou PDF. As entidades são destacadas no próprio texto.</p>
        </Link>
        <Link to="/exportacao" className="card passo">
          <span className="passo__n">2</span>
          <h3>Converse com o ExportBot</h3>
          <p>Escolha destino e cultura e veja o que está atendido, pendente ou em risco.</p>
        </Link>
        <Link to="/carbono" className="card passo">
          <span className="passo__n">3</span>
          <h3>Avalie o carbono</h3>
          <p>Informe os dados da propriedade e descubra o que falta para certificar créditos.</p>
        </Link>
      </div>
    </>
  );
}

function Resumo({ p }: { p: PainelDados }) {
  const totalSituacoes = SITUACOES.reduce((s, x) => s + p.situacoes[x.status], 0);
  const maior = Math.max(1, ...p.ocorrencias.map((o) => o.laudos));
  const creditos = p.recentes.carbono[0]?.creditosAno;

  return (
    <>
      <div className="kpis">
        <Kpi icone={<FileText size={21} />} valor={p.totais.laudos} rotulo="Laudos processados" />
        <Kpi icone={<Ship size={21} />} valor={p.totais.exportacoes} rotulo="Avaliações de exportação" />
        <Kpi icone={<Leaf size={21} />} valor={p.totais.carbono} rotulo="Avaliações de carbono" />
        <Kpi icone={<Sprout size={21} />} valor={creditos === undefined ? '—' : `~${fmtNum(creditos)}`} rotulo="Créditos/ano (última estimativa)" accent />
      </div>

      <div className="cols-2">
        <div className="stack">
          <Card titulo="Laudos recentes" acoes={<LinkButton to="/laudos" variante="ghost" tamanho="sm">Ver todos</LinkButton>}>
            <ul className="lista">
              {p.recentes.laudos.map((l) => (
                <li key={l.id}>
                  <Link to={`/laudos/${l.id}`}>
                    <FileText size={18} className="muted" />
                    <div>
                      <strong>{l.titulo ?? 'Laudo sem título'}</strong>
                      <small>
                        {l.numero ? `Nº ${l.numero} · ` : ''}
                        {fmtDataHora(l.createdAt)}
                      </small>
                    </div>
                    <span className="badge">{l.resumo.pragas.length + l.resumo.doencas.length} achado(s)</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card titulo="Avaliações de exportação" acoes={<LinkButton to="/historico" variante="ghost" tamanho="sm">Histórico</LinkButton>}>
            {p.recentes.exportacoes.length ? (
              <ul className="lista">
                {p.recentes.exportacoes.map((a) => (
                  <li key={a.id}>
                    <Link to={`/exportacao?avaliacao=${a.id}`}>
                      <Ship size={18} className="muted" />
                      <div>
                        <strong>
                          {a.cultura.nome} → {a.destino.nome}
                        </strong>
                        <small>{fmtDataHora(a.createdAt)}</small>
                      </div>
                      {a.resumo && <StatusBadge status={a.resumo.situacao} rotulo={`${a.resumo.score}%`} />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio icone={<Ship size={24} />} titulo="Nenhuma avaliação salva" acao={<LinkButton to="/exportacao" tamanho="sm">Abrir o ExportBot</LinkButton>}>
                Avalie um laudo no ExportBot e salve para acompanhar aqui.
              </Vazio>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card titulo="Situação das exportações" sub="Avaliações salvas, pela pior exigência de cada uma.">
            {totalSituacoes ? (
              <>
                <div className="empilhada" role="img" aria-label={SITUACOES.map((s) => `${p.situacoes[s.status]} ${s.rotulo.toLowerCase()}`).join(', ')}>
                  {SITUACOES.map((s) => (
                    <div key={s.status} style={{ width: `${(p.situacoes[s.status] / totalSituacoes) * 100}%`, background: s.cor }} />
                  ))}
                </div>
                <div className="legenda">
                  {SITUACOES.map((s) => (
                    <span key={s.status}>
                      <i className={`dot dot--${s.status}`} />
                      {s.rotulo}: <b>{p.situacoes[s.status]}</b>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">Ainda não há avaliações salvas.</p>
            )}
          </Card>

          <Card titulo="Pragas e doenças mais frequentes" sub="Em quantos dos seus laudos cada uma foi detectada.">
            {p.ocorrencias.length ? (
              <div className="barras">
                {p.ocorrencias.map((o) => (
                  <div key={o.termo} className={`barra ent--${o.tipo}`}>
                    <div className="row entre">
                      <span>{o.termo}</span>
                      <b>{o.laudos}</b>
                    </div>
                    <div className="barra__trilho">
                      <div style={{ width: `${(o.laudos / maior) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Nenhuma praga ou doença detectada nos laudos enviados.</p>
            )}
          </Card>

          {p.recentes.carbono.length > 0 && (
            <Card titulo="Carbono" acoes={<LinkButton to="/carbono" variante="ghost" tamanho="sm">CarbonBot</LinkButton>}>
              <ul className="lista">
                {p.recentes.carbono.map((a) => (
                  <li key={a.id}>
                    <Link to={`/carbono?avaliacao=${a.id}`}>
                      <Leaf size={18} className="muted" />
                      <div>
                        <strong>{a.nome}</strong>
                        <small>
                          ~{fmtNum(a.creditosAno ?? 0)} crédito(s)/ano · {fmtDataHora(a.createdAt)}
                        </small>
                      </div>
                      {a.resumo && <StatusBadge status={a.resumo.situacao} rotulo={`${a.resumo.score}%`} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export function Painel() {
  const { usuario } = useAuth();
  const painel = useApi<PainelDados>('/painel');
  return (
    <>
      <PageHeader
        titulo={`Olá, ${usuario?.nome.split(' ')[0] ?? ''}`}
        sub="Resumo dos seus laudos e avaliações."
        acoes={
          <LinkButton to="/laudos/novo" icone={<Plus size={17} />}>
            Novo laudo
          </LinkButton>
        }
      />
      <Estado {...painel}>{(p) => (p.totais.laudos === 0 ? <BoasVindas /> : <Resumo p={p} />)}</Estado>
    </>
  );
}
