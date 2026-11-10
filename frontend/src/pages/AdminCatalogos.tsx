import { Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, mensagemDe, useApi } from '../api';
import { Aviso, Button, Confirmar, Estado, Field, fmtNum, Modal, PageHeader, Tabs, useToast, Vazio } from '../ui';

/* Os quatro catálogos têm a mesma tela; só mudam a rota e os campos. */

interface Campo {
  chave: string;
  rotulo: string;
  numero?: { min: number; max: number; passo: number };
  dica?: string;
}
interface Catalogo {
  rotulo: string;
  singular: string;
  rota: string;
  campos: Campo[];
  nota?: string;
}
type Aba = 'destinos' | 'culturas' | 'biomas' | 'praticas';
type Linha = { id: string; _count?: { regras: number }; [chave: string]: unknown };

const NOME: Campo = { chave: 'nome', rotulo: 'Nome' };
const NOME_EN: Campo = { chave: 'nomeEn', rotulo: 'Nome em inglês', dica: 'Usado nas respostas e relatórios em inglês.' };

const CATALOGOS: Record<Aba, Catalogo> = {
  destinos: { rotulo: 'Destinos', singular: 'destino', rota: 'destinos', campos: [NOME, NOME_EN] },
  culturas: {
    rotulo: 'Culturas',
    singular: 'cultura',
    rota: 'culturas',
    campos: [NOME, NOME_EN],
    nota: 'Ao criar uma cultura, o nome dela entra automaticamente no dicionário do NER.',
  },
  biomas: {
    rotulo: 'Biomas',
    singular: 'bioma',
    rota: 'biomas',
    campos: [NOME, { chave: 'reservaLegalMin', rotulo: 'Reserva Legal mínima (%)', numero: { min: 0, max: 100, passo: 1 } }],
  },
  praticas: {
    rotulo: 'Práticas de carbono',
    singular: 'prática',
    rota: 'praticas',
    campos: [NOME, { chave: 'fatorTco2eHaAno', rotulo: 'Fator (tCO2e/ha/ano)', numero: { min: 0, max: 100, passo: 0.1 }, dica: 'Valor ilustrativo usado na estimativa de créditos.' }],
    nota: 'Os fatores são ilustrativos: servem para a calculadora, não para certificação.',
  },
};

function Tabela({ cat }: { cat: Catalogo }) {
  const avisar = useToast();
  const lista = useApi<Linha[]>(`/catalogo/${cat.rota}`);
  const [form, setForm] = useState<{ id?: string; valores: Record<string, string> } | null>(null);
  const [excluir, setExcluir] = useState<Linha | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const comRegras = cat.rota === 'destinos' || cat.rota === 'culturas';

  const abrir = (l?: Linha) => setForm({ id: l?.id, valores: Object.fromEntries(cat.campos.map((c) => [c.chave, l ? String(l[c.chave] ?? '') : ''])) });

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    try {
      await acao();
      avisar('ok', sucesso);
      setForm(null);
      lista.recarregar();
    } catch (e) {
      avisar('erro', e instanceof Error && e.message === 'Registro já existe.' ? `Já existe ${cat.singular} com esse nome.` : mensagemDe(e));
    } finally {
      setOcupado(false);
      setExcluir(null);
    }
  }

  function salvar() {
    if (!form) return;
    const body = Object.fromEntries(cat.campos.map((c) => [c.chave, c.numero ? Number(form.valores[c.chave]) : form.valores[c.chave].trim()]));
    void executar(
      () => api(form.id ? `/catalogo/${cat.rota}/${encodeURIComponent(form.id)}` : `/catalogo/${cat.rota}`, { method: form.id ? 'PATCH' : 'POST', body }),
      form.id ? 'Alterações salvas.' : `${cat.rotulo}: item criado.`,
    );
  }

  return (
    <>
      <div className="row entre">
        {cat.nota ? <Aviso>{cat.nota}</Aviso> : <span />}
        <Button icone={<Plus size={17} />} onClick={() => abrir()}>
          Adicionar {cat.singular}
        </Button>
      </div>
      <Estado {...lista}>
        {(linhas) =>
          linhas.length === 0 ? (
            <section className="card">
              <Vazio icone={<Database size={26} />} titulo="Nada cadastrado ainda">
                Adicione o primeiro item deste catálogo.
              </Vazio>
            </section>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {cat.campos.map((c) => (
                      <th key={c.chave}>{c.rotulo}</th>
                    ))}
                    {comRegras && <th>Regras</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.id}>
                      {cat.campos.map((c, i) => {
                        const v = l[c.chave];
                        const texto = typeof v === 'number' ? fmtNum(v) : String(v ?? '');
                        return <td key={c.chave}>{i === 0 ? <b>{texto}</b> : texto}</td>;
                      })}
                      {comRegras && <td>{l._count?.regras ?? 0}</td>}
                      <td>
                        <div className="acoes">
                          <button type="button" className="icon-btn" aria-label="Editar" title="Editar" onClick={() => abrir(l)}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn icon-btn--perigo" aria-label="Excluir" title="Excluir" onClick={() => setExcluir(l)}>
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
        titulo={`${form?.id ? 'Editar' : 'Adicionar'} ${cat.singular}`}
        onFechar={() => setForm(null)}
        onSubmit={salvar}
        rodape={
          <>
            <Button variante="secondary" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" carregando={ocupado}>
              Salvar
            </Button>
          </>
        }
      >
        {form &&
          cat.campos.map((c) => (
            <Field key={c.chave} rotulo={c.rotulo} dica={c.dica}>
              <input
                value={form.valores[c.chave]}
                onChange={(e) => setForm({ ...form, valores: { ...form.valores, [c.chave]: e.target.value } })}
                required
                {...(c.numero ? { type: 'number', min: c.numero.min, max: c.numero.max, step: c.numero.passo } : { maxLength: 120 })}
              />
            </Field>
          ))}
      </Modal>

      <Confirmar
        aberto={!!excluir}
        titulo={`Excluir ${cat.singular}?`}
        carregando={ocupado}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => excluir && void executar(() => api(`/catalogo/${cat.rota}/${encodeURIComponent(excluir.id)}`, { method: 'DELETE' }), 'Item excluído.')}
      >
        “{String(excluir?.nome ?? '')}” será removido.
        {comRegras && ' As regras de exportação ligadas a ele também são excluídas; se houver avaliações salvas que o usam, a exclusão é bloqueada.'}
      </Confirmar>
    </>
  );
}

export function AdminCatalogos() {
  const [aba, setAba] = useState<Aba>('destinos');
  return (
    <>
      <PageHeader titulo="Catálogos" sub="Listas de referência usadas nos formulários do ExportBot e do CarbonBot." />
      <Tabs valor={aba} onChange={setAba} abas={(Object.keys(CATALOGOS) as Aba[]).map((a) => ({ valor: a, rotulo: CATALOGOS[a].rotulo }))} />
      <Tabela key={aba} cat={CATALOGOS[aba]} />
    </>
  );
}
