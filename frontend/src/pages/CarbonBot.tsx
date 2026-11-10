import { Leaf, Printer, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { api, mensagemDe, useApi } from '../api';
import { Chat } from '../components/Chat';
import { Checklist, Placar } from '../components/Checklist';
import type { AvaliacaoCarbono, AvaliacaoCarbonoSalva, Propriedade, Referencias, RespostaChat } from '../types';
import { Aviso, Button, Card, Carregando, Falha, Field, fmtNum, LinkButton, PageHeader, Segmentado, useToast } from '../ui';

interface Form {
  nome: string;
  bioma: string;
  area: string; // texto enquanto digita; vira número no envio
  rl: string;
  car: boolean;
  desmatamento: boolean;
  padrao: string;
  praticas: string[];
  mrv: boolean;
}

const CHAVE = 'agroready-carbono'; // último formulário (conveniência)
const INICIAL: Form = { nome: '', bioma: 'cerrado', area: '120', rl: '30', car: true, desmatamento: false, padrao: 'Verra VCS', praticas: ['pd'], mrv: false };
const SIM_NAO = [
  { valor: 'sim' as const, rotulo: 'Sim' },
  { valor: 'nao' as const, rotulo: 'Não' },
];

const paraPayload = (f: Form): Propriedade => ({
  bioma: f.bioma,
  area: Number(f.area) || 0,
  rl: Number(f.rl) || 0,
  car: f.car,
  desmatamento: f.desmatamento,
  praticas: f.praticas,
  mrv: f.mrv,
  padrao: f.padrao,
});

export function CarbonBot() {
  const [params] = useSearchParams();
  const avisar = useToast();
  const refs = useApi<Referencias>('/referencias');
  const [form, setForm] = useState<Form | null>(null);
  const [avaliado, setAvaliado] = useState(false);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoCarbono | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvaId, setSalvaId] = useState<string | null>(null);
  const [disparo, setDisparo] = useState({ texto: 'Resumo', n: 0 });
  const pedido = useRef(0);
  const resultado = useRef<HTMLDivElement>(null);

  // Estado inicial: avaliação reaberta do histórico ou último formulário, conferido contra o catálogo atual.
  useEffect(() => {
    const r = refs.dados;
    if (!r || form) return;
    const ajustar = (f: Form): Form => ({
      ...f,
      bioma: r.biomas.some((b) => b.id === f.bioma) ? f.bioma : (r.biomas[0]?.id ?? ''),
      padrao: r.padroes.includes(f.padrao) ? f.padrao : (r.padroes[0] ?? ''),
      praticas: f.praticas.filter((id) => r.praticas.some((p) => p.id === id)),
    });
    let salvo: Partial<Form> = {};
    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Form>;
    } catch {
      /* ignora preferências corrompidas */
    }
    const base = ajustar({ ...INICIAL, ...salvo });
    const reabrir = params.get('avaliacao');
    if (!reabrir) return setForm(base);
    api<AvaliacaoCarbonoSalva>(`/carbono/avaliacoes/${reabrir}`).then(
      (a) => {
        const d = a.dados!;
        setForm(ajustar({ nome: a.nome, bioma: d.bioma, area: String(d.area), rl: String(d.rl), car: d.car, desmatamento: d.desmatamento, padrao: d.padrao, praticas: d.praticas, mrv: d.mrv }));
        setSalvaId(a.id);
        setAvaliado(true);
      },
      (e) => {
        avisar('erro', mensagemDe(e));
        setForm(base);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez, quando o catálogo chega
  }, [refs.dados]);

  // Depois da primeira avaliação, qualquer mudança no formulário reavalia.
  useEffect(() => {
    if (!form) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(form));
    } catch {
      /* armazenamento indisponível */
    }
    if (!avaliado) return;
    const n = ++pedido.current;
    api<AvaliacaoCarbono>('/carbono/avaliar', { body: paraPayload(form) }).then(
      (a) => {
        if (n !== pedido.current) return;
        setAvaliacao(a);
        setErro(null);
      },
      (e) => {
        if (n !== pedido.current) return;
        setAvaliacao(null);
        setErro(mensagemDe(e));
      },
    );
  }, [form, avaliado]);

  const mudar = (parte: Partial<Form>) => {
    setForm((f) => f && { ...f, ...parte });
    setSalvaId(null);
  };

  function avaliar(e: FormEvent) {
    e.preventDefault();
    setAvaliado(true);
    setDisparo((d) => ({ texto: 'Resumo', n: d.n + 1 })); // o bot comenta o resultado
    // o resultado aparece abaixo do formulário: leva a tela até ele
    requestAnimationFrame(() => resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return avisar('erro', 'Dê um nome à propriedade para salvar a avaliação.');
    setSalvando(true);
    try {
      const salva = await api<AvaliacaoCarbonoSalva>('/carbono/avaliacoes', { body: { nome: form.nome.trim(), propriedade: paraPayload(form) } });
      setSalvaId(salva.id);
      avisar('ok', 'Avaliação salva no histórico.');
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  const cabecalho = (
    <PageHeader titulo="CarbonBot" sub="Avalia a elegibilidade da propriedade a créditos de carbono no mercado voluntário e estima o potencial de créditos." />
  );
  if (!refs.dados || !form) {
    return (
      <>
        {cabecalho}
        {refs.erro ? <Falha {...refs} /> : <Carregando />}
      </>
    );
  }
  const r = refs.dados;
  const est = avaliacao?.estimativa;

  return (
    <>
      {cabecalho}
      <Aviso>
        A agropecuária está fora do mercado regulado (SBCE, Lei nº 15.042/2024). Os créditos do setor seguem pelo <b>mercado voluntário</b>, com
        padrões como Verra VCS e Gold Standard.
      </Aviso>
      <div className="split">
        <div className="stack">
          <Card titulo="Dados da propriedade">
            <form className="stack" onSubmit={avaliar}>
              <div className="form-grid">
                <Field rotulo="Nome da propriedade" className="inteira" dica="Usado para identificar a avaliação no histórico.">
                  <input value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} maxLength={120} placeholder="Ex.: Fazenda Santa Clara" />
                </Field>
                <Field rotulo="Bioma" dica={`Reserva Legal mínima: ${r.biomas.find((b) => b.id === form.bioma)?.reservaLegalMin ?? '—'}%`}>
                  <select value={form.bioma} onChange={(e) => mudar({ bioma: e.target.value })}>
                    {r.biomas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field rotulo="Padrão de certificação">
                  <select value={form.padrao} onChange={(e) => mudar({ padrao: e.target.value })}>
                    {r.padroes.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field rotulo="Área total (ha)">
                  <input type="number" min={0} step="any" required value={form.area} onChange={(e) => mudar({ area: e.target.value })} />
                </Field>
                <Field rotulo="Reserva Legal atual (%)">
                  <input type="number" min={0} max={100} step="any" required value={form.rl} onChange={(e) => mudar({ rl: e.target.value })} />
                </Field>
                <div className="field">
                  <span className="field__label">CAR/SICAR ativo</span>
                  <Segmentado rotulo="CAR/SICAR ativo" valor={form.car ? 'sim' : 'nao'} opcoes={SIM_NAO} onChange={(v) => mudar({ car: v === 'sim' })} />
                </div>
                <div className="field">
                  <span className="field__label">Desmatamento recente</span>
                  <Segmentado rotulo="Desmatamento recente" valor={form.desmatamento ? 'sim' : 'nao'} opcoes={SIM_NAO} onChange={(v) => mudar({ desmatamento: v === 'sim' })} />
                </div>
              </div>

              <fieldset className="grupo">
                <legend>Práticas de baixo carbono adotadas (Plano ABC+)</legend>
                {r.praticas.map((p) => (
                  <label key={p.id} className="check">
                    <input
                      type="checkbox"
                      checked={form.praticas.includes(p.id)}
                      onChange={(e) => mudar({ praticas: e.target.checked ? [...form.praticas, p.id] : form.praticas.filter((x) => x !== p.id) })}
                    />
                    <span>
                      {p.nome}
                      <small>{fmtNum(p.fatorTco2eHaAno)} tCO2e/ha/ano (fator ilustrativo)</small>
                    </span>
                  </label>
                ))}
                <label className="check">
                  <input type="checkbox" checked={form.mrv} onChange={(e) => mudar({ mrv: e.target.checked })} />
                  <span>
                    Possuo plano de monitoramento, relato e verificação (MRV)
                    <small>Como as remoções serão medidas e auditadas.</small>
                  </span>
                </label>
              </fieldset>

              <div className="row">
                <Button type="submit" icone={<Leaf size={17} />}>
                  Avaliar elegibilidade
                </Button>
              </div>
            </form>
          </Card>

          {avaliado && (
            <div ref={resultado} style={{ scrollMarginTop: 20 }}>
            <Card
              titulo="Elegibilidade"
              acoes={
                avaliacao && (
                  <div className="row">
                    {salvaId && (
                      <LinkButton to={`/relatorio/carbono/${salvaId}`} variante="secondary" tamanho="sm" icone={<Printer size={15} />}>
                        Relatório
                      </LinkButton>
                    )}
                    <Button tamanho="sm" icone={<Save size={15} />} onClick={salvar} carregando={salvando} disabled={!!salvaId}>
                      {salvaId ? 'Salva' : 'Salvar avaliação'}
                    </Button>
                  </div>
                )
              }
            >
              {erro && <Aviso tipo="erro">{erro}</Aviso>}
              {!avaliacao && !erro && <Carregando />}
              {avaliacao && est && (
                <>
                  <Placar resumo={avaliacao.resumo} total={avaliacao.items.length} unidade="critérios atendidos" />
                  {est.praticaBase ? (
                    <div className="conta" aria-label="Estimativa de créditos">
                      <div>
                        <b>{fmtNum(est.areaProdutivaHa)} ha</b>
                        <span>área produtiva (sem a Reserva Legal)</span>
                      </div>
                      <div>
                        <b>× {fmtNum(est.praticaBase.fatorTco2eHaAno)}</b>
                        <span>tCO2e/ha/ano · {est.praticaBase.nome}</span>
                      </div>
                      <div>
                        <b>{fmtNum(est.potencialTco2eAno)}</b>
                        <span>tCO2e/ano, menos {est.bufferPct}% de buffer</span>
                      </div>
                      <div className="destaque">
                        <b>~{fmtNum(est.creditosAno)}</b>
                        <span>crédito(s)/ano</span>
                      </div>
                    </div>
                  ) : (
                    <Aviso tipo="warn">Selecione ao menos uma prática de baixo carbono para estimar os créditos.</Aviso>
                  )}
                  <Checklist items={avaliacao.items} />
                </>
              )}
              <p className="muted pequeno">
                Critérios e fatores ilustrativos; a base real deve ser curada de CAR/SICAR, Plano ABC+ (MAPA), Verra VCS e Gold Standard.
              </p>
            </Card>
            </div>
          )}
        </div>

        <Chat
          nome="CarbonBot"
          descricao="assistente de créditos de carbono"
          saudacao="Olá! Sou o **CarbonBot**. Preencha os dados da propriedade, clique em **Avaliar elegibilidade** e pergunte, por exemplo, “o que falta para me qualificar?”."
          sugestoes={['O que falta?', 'Quantos créditos?', 'Reserva Legal', 'Práticas elegíveis', 'Qual padrão escolher?', 'Mercado regulado?']}
          placeholder="Pergunte sobre créditos, Reserva Legal, práticas…"
          disparo={disparo}
          enviar={(mensagem) => api<RespostaChat>('/carbono/chat', { body: { mensagem, propriedade: paraPayload(form), avaliado } })}
        />
      </div>
    </>
  );
}
