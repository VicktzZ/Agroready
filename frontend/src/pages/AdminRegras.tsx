import { Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, mensagemDe, useApi } from '../api';
import { Termos } from '../components/LaudoTexto';
import type { Referencias, Regra, Termo } from '../types';
import { Aviso, Button, Confirmar, Estado, Field, Modal, PageHeader, useToast, Vazio } from '../ui';

interface Form {
  id?: number;
  destinoId: string;
  culturaId: string;
  maxDias: string;
  bloqueios: string[];
  docs: string; // um documento por linha
}

export function AdminRegras() {
  const avisar = useToast();
  const regras = useApi<Regra[]>('/export/regras');
  const refs = useApi<Referencias>('/referencias');
  const termos = useApi<Termo[]>('/ner/termos');
  const [form, setForm] = useState<Form | null>(null);
  const [filtro, setFiltro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<Regra | null>(null);

  const nova = () =>
    setForm({ destinoId: refs.dados?.destinos[0]?.id ?? '', culturaId: refs.dados?.culturas[0]?.id ?? '', maxDias: '30', bloqueios: [], docs: '' });
  const editar = (r: Regra) =>
    setForm({ id: r.id, destinoId: r.destinoId, culturaId: r.culturaId, maxDias: String(r.maxDias), bloqueios: r.bloqueios, docs: r.docs.join('\n') });
  const mudar = (parte: Partial<Form>) => setForm((f) => f && { ...f, ...parte });

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    const body = {
      destinoId: form.destinoId,
      culturaId: form.culturaId,
      maxDias: Number(form.maxDias),
      bloqueios: form.bloqueios,
      docs: form.docs
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean),
    };
    try {
      await api(form.id ? `/export/regras/${form.id}` : '/export/regras', { method: form.id ? 'PATCH' : 'POST', body });
      avisar('ok', form.id ? 'Regra atualizada.' : 'Regra criada.');
      setForm(null);
      regras.recarregar();
    } catch (e) {
      avisar('erro', e instanceof Error && e.message === 'Registro já existe.' ? 'Já existe uma regra para este destino e cultura.' : mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!excluir) return;
    setSalvando(true);
    try {
      await api(`/export/regras/${excluir.id}`, { method: 'DELETE' });
      avisar('ok', 'Regra excluída.');
      regras.recarregar();
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setSalvando(false);
      setExcluir(null);
    }
  }

  // pragas/doenças do dicionário + bloqueios antigos que já não estão nele (para poder desmarcar)
  const candidatos = [
    ...(termos.dados ?? []).filter((t) => t.tipo !== 'CULTURA'),
    ...(form?.bloqueios ?? []).filter((b) => !termos.dados?.some((t) => t.termo === b)).map((termo) => ({ id: -1, tipo: 'PRAGA' as const, termo })),
  ].filter((t) => t.termo.includes(filtro.trim().toLowerCase()) || form?.bloqueios.includes(t.termo));

  return (
    <>
      <PageHeader
        titulo="Regras de exportação"
        sub="Exigências por destino × cultura usadas pelo ExportBot: prazo da inspeção, pragas/doenças que bloqueiam o embarque e documentos."
        acoes={
          <Button icone={<Plus size={17} />} onClick={nova} disabled={!refs.dados}>
            Nova regra
          </Button>
        }
      />
      <Estado {...regras}>
        {(lista) =>
          lista.length === 0 ? (
            <section className="card">
              <Vazio icone={<Scale size={26} />} titulo="Nenhuma regra cadastrada">
                Sem regras, o ExportBot não consegue avaliar nenhum destino.
              </Vazio>
            </section>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Cultura</th>
                    <th>Prazo da inspeção</th>
                    <th>Bloqueiam o embarque</th>
                    <th>Documentos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.destino.nome}</b>
                      </td>
                      <td>{r.cultura.nome}</td>
                      <td className="nowrap">até {r.maxDias} dias</td>
                      <td>
                        <Termos tipo="PRAGA" itens={r.bloqueios} vazio="nenhum" />
                      </td>
                      <td>
                        {r.docs.length ? r.docs.map((d) => <span key={d} className="sub" style={{ color: 'inherit' }}>{d}</span>) : <span className="muted">nenhum</span>}
                      </td>
                      <td>
                        <div className="acoes">
                          <button type="button" className="icon-btn" aria-label="Editar" title="Editar" onClick={() => editar(r)}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn icon-btn--perigo" aria-label="Excluir" title="Excluir" onClick={() => setExcluir(r)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Estado>

      <Modal
        aberto={!!form}
        titulo={form?.id ? 'Editar regra' : 'Nova regra'}
        onFechar={() => setForm(null)}
        onSubmit={salvar}
        rodape={
          <>
            <Button variante="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={salvando}>
              Salvar
            </Button>
          </>
        }
      >
        {form && refs.dados && (
          <>
            <div className="form-grid">
              <Field rotulo="Destino">
                <select value={form.destinoId} onChange={(e) => mudar({ destinoId: e.target.value })} required>
                  {refs.dados.destinos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field rotulo="Cultura">
                <select value={form.culturaId} onChange={(e) => mudar({ culturaId: e.target.value })} required>
                  {refs.dados.culturas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field rotulo="Prazo máximo da inspeção (dias)" className="inteira" dica="Idade máxima da inspeção na data do embarque.">
                <input type="number" min={0} max={365} step={1} required value={form.maxDias} onChange={(e) => mudar({ maxDias: e.target.value })} />
              </Field>
            </div>

            <div className="field">
              <span className="field__label">Pragas e doenças que bloqueiam o embarque</span>
              <input className="input" placeholder="Filtrar termos do dicionário…" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar termos" />
              <div className="opcoes">
                {candidatos.map((t) => (
                  <label key={t.termo} className={`pill ent--${t.tipo}`}>
                    <input
                      type="checkbox"
                      checked={form.bloqueios.includes(t.termo)}
                      onChange={(e) => mudar({ bloqueios: e.target.checked ? [...form.bloqueios, t.termo] : form.bloqueios.filter((b) => b !== t.termo) })}
                    />
                    {t.termo}
                  </label>
                ))}
                {!candidatos.length && <span className="muted pequeno">Nenhum termo encontrado.</span>}
              </div>
              <span className="field__dica">{form.bloqueios.length} selecionado(s). Só termos do dicionário do NER podem ser detectados no laudo.</span>
            </div>

            <Field rotulo="Documentos exigidos" dica="Um por linha. O produtor confirma cada um manualmente.">
              <textarea rows={4} value={form.docs} onChange={(e) => mudar({ docs: e.target.value })} placeholder={'Certificado fitossanitário\nDeclaração de origem'} />
            </Field>
          </>
        )}
        {form && !refs.dados && <Aviso tipo="warn">Carregando destinos e culturas…</Aviso>}
      </Modal>

      <Confirmar aberto={!!excluir} titulo="Excluir regra?" carregando={salvando} onConfirmar={remover} onCancelar={() => setExcluir(null)}>
        O ExportBot deixará de avaliar {excluir?.cultura.nome} → {excluir?.destino.nome}. Avaliações já salvas continuam no histórico.
      </Confirmar>
    </>
  );
}
