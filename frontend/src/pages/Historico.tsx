import { FolderOpen, History, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, mensagemDe, useApi } from '../api';
import type { AvaliacaoCarbonoSalva, AvaliacaoExportSalva } from '../types';
import { Confirmar, Estado, fmtDataHora, fmtDia, fmtNum, LinkButton, PageHeader, StatusBadge, Tabs, useToast, Vazio } from '../ui';

type Aba = 'exportacao' | 'carbono';

function Acoes({ abrir, relatorio, onExcluir }: { abrir: string; relatorio: string; onExcluir: () => void }) {
  return (
    <div className="acoes">
      <Link to={abrir} className="icon-btn" title="Reabrir" aria-label="Reabrir">
        <FolderOpen size={17} />
      </Link>
      <Link to={relatorio} className="icon-btn" title="Relatório" aria-label="Relatório">
        <Printer size={17} />
      </Link>
      <button type="button" className="icon-btn icon-btn--perigo" title="Excluir" aria-label="Excluir" onClick={onExcluir}>
        <Trash2 size={17} />
      </button>
    </div>
  );
}

export function Historico() {
  const avisar = useToast();
  const [aba, setAba] = useState<Aba>('exportacao');
  const exportacoes = useApi<AvaliacaoExportSalva[]>('/export/avaliacoes');
  const carbono = useApi<AvaliacaoCarbonoSalva[]>('/carbono/avaliacoes');
  const [excluir, setExcluir] = useState<{ aba: Aba; id: string; nome: string } | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      await api(`/${excluir.aba === 'exportacao' ? 'export' : 'carbono'}/avaliacoes/${excluir.id}`, { method: 'DELETE' });
      (excluir.aba === 'exportacao' ? exportacoes : carbono).recarregar();
      avisar('ok', 'Avaliação excluída.');
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setExcluindo(false);
      setExcluir(null);
    }
  }

  return (
    <>
      <PageHeader titulo="Histórico" sub="Avaliações salvas. Reabra para continuar, gere o relatório ou exclua." />
      <Tabs
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: 'exportacao', rotulo: 'Exportação', contagem: exportacoes.dados?.length },
          { valor: 'carbono', rotulo: 'Carbono', contagem: carbono.dados?.length },
        ]}
      />

      {aba === 'exportacao' ? (
        <Estado {...exportacoes}>
          {(lista) =>
            lista.length === 0 ? (
              <section className="card">
                <Vazio icone={<History size={26} />} titulo="Nenhuma avaliação de exportação salva" acao={<LinkButton to="/exportacao">Abrir o ExportBot</LinkButton>}>
                  No ExportBot, clique em “Salvar avaliação” para guardar o resultado aqui.
                </Vazio>
              </section>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rota</th>
                      <th>Laudo</th>
                      <th>Embarque</th>
                      <th>Situação</th>
                      <th>Salva em</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <b>
                            {a.cultura.nome} → {a.destino.nome}
                          </b>
                        </td>
                        <td>
                          <Link to={`/laudos/${a.laudo.id}`}>{a.laudo.titulo ?? 'Laudo'}</Link>
                          {a.laudo.numero && <span className="sub">Nº {a.laudo.numero}</span>}
                        </td>
                        <td className="nowrap">{fmtDia(a.embarque)}</td>
                        <td>
                          {a.resumo && <StatusBadge status={a.resumo.situacao} />}
                          {a.resumo && <span className="sub">{a.resumo.score}% atendido</span>}
                        </td>
                        <td className="nowrap">{fmtDataHora(a.createdAt)}</td>
                        <td>
                          <Acoes
                            abrir={`/exportacao?avaliacao=${a.id}`}
                            relatorio={`/relatorio/exportacao/${a.id}`}
                            onExcluir={() => setExcluir({ aba: 'exportacao', id: a.id, nome: `${a.cultura.nome} → ${a.destino.nome}` })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Estado>
      ) : (
        <Estado {...carbono}>
          {(lista) =>
            lista.length === 0 ? (
              <section className="card">
                <Vazio icone={<History size={26} />} titulo="Nenhuma avaliação de carbono salva" acao={<LinkButton to="/carbono">Abrir o CarbonBot</LinkButton>}>
                  No CarbonBot, avalie a propriedade e clique em “Salvar avaliação”.
                </Vazio>
              </section>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Propriedade</th>
                      <th>Créditos/ano</th>
                      <th>Situação</th>
                      <th>Salva em</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <b>{a.nome}</b>
                        </td>
                        <td className="nowrap">~{fmtNum(a.creditosAno ?? 0)}</td>
                        <td>
                          {a.resumo && <StatusBadge status={a.resumo.situacao} />}
                          {a.resumo && <span className="sub">{a.resumo.score}% atendido</span>}
                        </td>
                        <td className="nowrap">{fmtDataHora(a.createdAt)}</td>
                        <td>
                          <Acoes abrir={`/carbono?avaliacao=${a.id}`} relatorio={`/relatorio/carbono/${a.id}`} onExcluir={() => setExcluir({ aba: 'carbono', id: a.id, nome: a.nome })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </Estado>
      )}

      <Confirmar aberto={!!excluir} titulo="Excluir avaliação?" carregando={excluindo} onConfirmar={confirmarExclusao} onCancelar={() => setExcluir(null)}>
        A avaliação “{excluir?.nome}” será removida do histórico. Esta ação não pode ser desfeita.
      </Confirmar>
    </>
  );
}
