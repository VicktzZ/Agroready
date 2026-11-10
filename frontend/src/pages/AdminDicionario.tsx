import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, mensagemDe, useApi } from '../api';
import { ENTIDADE, Termo as Etiqueta } from '../components/LaudoTexto';
import type { Regra, Termo, TipoDicionario } from '../types';
import { Button, Card, Confirmar, Estado, Field, Modal, PageHeader, Tabs, useToast, Vazio } from '../ui';

const TIPOS: TipoDicionario[] = ['PRAGA', 'DOENCA', 'CULTURA'];
type Aba = 'TODOS' | TipoDicionario;

const erroDeTermo = (e: unknown) => (e instanceof Error && e.message === 'Registro já existe.' ? 'Este termo já está no dicionário.' : mensagemDe(e));

export function AdminDicionario() {
  const avisar = useToast();
  const termos = useApi<Termo[]>('/ner/termos');
  const regras = useApi<Regra[]>('/export/regras');
  const [aba, setAba] = useState<Aba>('TODOS');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState<{ tipo: TipoDicionario; termo: string }>({ tipo: 'PRAGA', termo: '' });
  const [editando, setEditando] = useState<Termo | null>(null);
  const [excluir, setExcluir] = useState<Termo | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<unknown>, sucesso: string, depois: () => void) {
    setOcupado(true);
    try {
      await acao();
      avisar('ok', sucesso);
      depois();
      termos.recarregar();
    } catch (e) {
      avisar('erro', erroDeTermo(e));
    } finally {
      setOcupado(false);
    }
  }

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    void executar(
      () => api('/ner/termos', { body: { tipo: novo.tipo, termo: novo.termo } }),
      'Termo adicionado. Reprocesse laudos antigos para aplicá-lo.',
      () => setNovo((n) => ({ ...n, termo: '' })),
    );
  };

  const emUso = excluir ? (regras.dados ?? []).filter((r) => r.bloqueios.includes(excluir.termo)).length : 0;

  return (
    <>
      <PageHeader
        titulo="Dicionário do NER"
        sub="Termos que o reconhecimento de entidades procura nos laudos. Hífen casa com espaço; plural e erro de digitação são tolerados."
      />

      <Card titulo="Adicionar termo">
        <form className="row" onSubmit={adicionar} style={{ alignItems: 'flex-end' }}>
          <Field rotulo="Tipo">
            <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as TipoDicionario })}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ENTIDADE[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field rotulo="Termo" className="crescer">
            <input value={novo.termo} onChange={(e) => setNovo({ ...novo, termo: e.target.value })} placeholder="Ex.: lagarta-do-cartucho" required minLength={3} maxLength={80} />
          </Field>
          <Button type="submit" icone={<Plus size={17} />} carregando={ocupado && !editando && !excluir}>
            Adicionar
          </Button>
        </form>
      </Card>

      <Estado {...termos}>
        {(lista) => {
          const visiveis = lista.filter((t) => (aba === 'TODOS' || t.tipo === aba) && t.termo.includes(busca.trim().toLowerCase()));
          return (
            <>
              <div className="row entre">
                <Tabs
                  valor={aba}
                  onChange={setAba}
                  abas={[
                    { valor: 'TODOS', rotulo: 'Todos', contagem: lista.length },
                    ...TIPOS.map((t) => ({ valor: t as Aba, rotulo: `${ENTIDADE[t]}s`, contagem: lista.filter((x) => x.tipo === t).length })),
                  ]}
                />
                <input className="input" style={{ maxWidth: 260 }} placeholder="Buscar termo…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar termo" />
              </div>
              {visiveis.length === 0 ? (
                <section className="card">
                  <Vazio icone={<BookOpen size={26} />} titulo="Nenhum termo encontrado">
                    Ajuste a busca ou adicione um termo acima.
                  </Vazio>
                </section>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Termo</th>
                        <th>Tipo</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <Etiqueta tipo={t.tipo}>{t.termo}</Etiqueta>
                          </td>
                          <td>{ENTIDADE[t.tipo]}</td>
                          <td>
                            <div className="acoes">
                              <button type="button" className="icon-btn" aria-label={`Editar ${t.termo}`} title="Editar" onClick={() => setEditando(t)}>
                                <Pencil size={16} />
                              </button>
                              <button type="button" className="icon-btn icon-btn--perigo" aria-label={`Excluir ${t.termo}`} title="Excluir" onClick={() => setExcluir(t)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        }}
      </Estado>

      <Modal
        aberto={!!editando}
        titulo="Editar termo"
        onFechar={() => setEditando(null)}
        onSubmit={() =>
          editando &&
          void executar(
            () => api(`/ner/termos/${editando.id}`, { method: 'PATCH', body: { tipo: editando.tipo, termo: editando.termo } }),
            'Termo atualizado.',
            () => setEditando(null),
          )
        }
        rodape={
          <>
            <Button variante="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={ocupado}>
              Salvar
            </Button>
          </>
        }
      >
        {editando && (
          <>
            <Field rotulo="Tipo">
              <select value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value as TipoDicionario })}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ENTIDADE[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field rotulo="Termo">
              <input value={editando.termo} onChange={(e) => setEditando({ ...editando, termo: e.target.value })} required minLength={3} maxLength={80} />
            </Field>
          </>
        )}
      </Modal>

      <Confirmar
        aberto={!!excluir}
        titulo="Excluir termo?"
        carregando={ocupado}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => excluir && void executar(() => api(`/ner/termos/${excluir.id}`, { method: 'DELETE' }), 'Termo excluído.', () => setExcluir(null))}
      >
        “{excluir?.termo}” deixará de ser reconhecido em novos laudos.
        {emUso > 0 && ` Atenção: ele é bloqueio em ${emUso} regra(s) de exportação, que deixarão de detectá-lo.`}
      </Confirmar>
    </>
  );
}
