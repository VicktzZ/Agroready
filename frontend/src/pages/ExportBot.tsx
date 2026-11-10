import { FileText, Printer, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, mensagemDe, useApi } from '../api';
import { Chat } from '../components/Chat';
import { Checklist, Placar } from '../components/Checklist';
import type { AvaliacaoExport, AvaliacaoExportSalva, Lang, LaudoItem, Referencias, RespostaChat } from '../types';
import { Aviso, Button, Card, Carregando, Falha, Field, fmtDia, LinkButton, PageHeader, Segmentado, useToast } from '../ui';

interface Form {
  laudoId: string;
  destino: string;
  cultura: string;
  embarque: string;
  lang: Lang;
}

const CHAVE = 'agroready-export'; // últimas escolhas (conveniência; nada sensível)
const preferencias = (): Partial<Form> => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Form>;
  } catch {
    return {};
  }
};

const TEXTOS = {
  pt: {
    saudacao: 'Olá! Sou o **ExportBot**. Escolha o laudo, o destino e a cultura: eu cruzo tudo com as exigências e respondo suas dúvidas.',
    sugestoes: ['O que está pendente?', 'Quais pragas?', 'Documentos', 'Prazo da inspeção', 'O que a China exige?'],
    unidade: 'exigências atendidas',
  },
  en: {
    saudacao: 'Hi! I am **ExportBot**. Pick the report, destination and crop: I cross-check everything with the requirements and answer your questions.',
    sugestoes: ['What is pending?', 'Which pests?', 'Documents', 'Inspection deadline', 'What does China require?'],
    unidade: 'requirements met',
  },
};

export function ExportBot() {
  const [params] = useSearchParams();
  const avisar = useToast();
  const refs = useApi<Referencias>('/referencias');
  const laudos = useApi<LaudoItem[]>('/laudos');
  const [form, setForm] = useState<Form | null>(null);
  const [docs, setDocs] = useState<string[]>([]); // documentos confirmados pelo produtor
  const [avaliacao, setAvaliacao] = useState<AvaliacaoExport | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvaId, setSalvaId] = useState<string | null>(null);
  const pedido = useRef(0);

  // Estado inicial: avaliação reaberta do histórico, laudo vindo da tela de laudos ou últimas escolhas.
  const pronto = !!refs.dados && !!laudos.dados;
  useEffect(() => {
    if (!refs.dados || !laudos.dados || form) return;
    const pref = preferencias();
    const valido = (lista: { id: string }[], id?: string) => (lista.some((x) => x.id === id) ? id! : (lista[0]?.id ?? ''));
    const base: Form = {
      laudoId: params.get('laudo') ?? laudos.dados[0]?.id ?? '',
      destino: valido(refs.dados.destinos, pref.destino),
      cultura: valido(refs.dados.culturas, pref.cultura),
      embarque: pref.embarque ?? '',
      lang: pref.lang === 'en' ? 'en' : 'pt',
    };
    const reabrir = params.get('avaliacao');
    if (!reabrir) return setForm(base);
    api<AvaliacaoExportSalva>(`/export/avaliacoes/${reabrir}`).then(
      (a) => {
        setDocs(a.docsConfirmados);
        setSalvaId(a.id);
        setForm({ ...base, laudoId: a.laudoId, destino: a.destinoId, cultura: a.culturaId, embarque: a.embarque ?? '' });
      },
      (e) => {
        avisar('erro', mensagemDe(e));
        setForm(base);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez, quando os catálogos chegam
  }, [pronto]);

  const contexto = (f: Form) => ({
    laudoId: f.laudoId || undefined,
    destino: f.destino,
    cultura: f.cultura,
    embarque: f.embarque || undefined,
    docsConfirmados: docs,
    lang: f.lang,
  });

  // Reavalia a cada mudança; ignora respostas antigas que chegarem fora de ordem.
  useEffect(() => {
    if (!form?.destino || !form.cultura) return;
    const n = ++pedido.current;
    api<AvaliacaoExport>('/export/avaliar', { body: contexto(form) }).then(
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
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ destino: form.destino, cultura: form.cultura, embarque: form.embarque, lang: form.lang }));
    } catch {
      /* armazenamento indisponível: só não lembra as escolhas */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `contexto` depende só de form e docs
  }, [form, docs]);

  const mudar = (parte: Partial<Form>) => {
    setForm((f) => f && { ...f, ...parte });
    if (!('lang' in parte)) setSalvaId(null); // o que foi salvo já não reflete a tela
  };

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    try {
      const salva = await api<AvaliacaoExportSalva>('/export/avaliacoes', { body: contexto(form) });
      setSalvaId(salva.id);
      avisar('ok', 'Avaliação salva no histórico.');
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  const cabecalho = <PageHeader titulo="ExportBot" sub="Cruza as entidades do laudo com as exigências do país de destino e responde em linguagem natural." />;
  if (!pronto) {
    return (
      <>
        {cabecalho}
        {refs.erro ? <Falha {...refs} /> : laudos.erro ? <Falha {...laudos} /> : <Carregando />}
      </>
    );
  }
  if (!form) {
    return (
      <>
        {cabecalho}
        <Carregando />
      </>
    );
  }

  const L = TEXTOS[form.lang];
  const laudo = laudos.dados!.find((l) => l.id === form.laudoId);
  const semCatalogo = !refs.dados!.destinos.length || !refs.dados!.culturas.length;

  return (
    <>
      {cabecalho}
      <div className="split">
        <div className="stack">
          <Card titulo="O que avaliar">
            {laudos.dados!.length === 0 && (
              <Aviso tipo="warn">
                Você ainda não enviou nenhum laudo. <Link to="/laudos/novo">Enviar laudo</Link> — sem ele, as exigências ficam pendentes.
              </Aviso>
            )}
            {semCatalogo && <Aviso tipo="warn">Não há destinos ou culturas cadastrados. Um administrador precisa cadastrá-los em Catálogos.</Aviso>}
            <div className="form-grid">
              <Field
                rotulo="Laudo"
                className="inteira"
                dica={
                  laudo
                    ? `Culturas no laudo: ${laudo.resumo.culturas.join(', ') || 'nenhuma'} · última inspeção: ${fmtDia(laudo.resumo.ultimaInspecao)}`
                    : undefined
                }
              >
                <select value={form.laudoId} onChange={(e) => mudar({ laudoId: e.target.value })}>
                  <option value="">— sem laudo —</option>
                  {laudos.dados!.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titulo ?? 'Laudo sem título'}
                      {l.numero ? ` · nº ${l.numero}` : ''} — {fmtDia(l.createdAt)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field rotulo="Destino">
                <select value={form.destino} onChange={(e) => mudar({ destino: e.target.value })}>
                  {refs.dados!.destinos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field rotulo="Cultura">
                <select value={form.cultura} onChange={(e) => mudar({ cultura: e.target.value })}>
                  {refs.dados!.culturas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field rotulo="Embarque previsto">
                <input type="date" value={form.embarque} onChange={(e) => mudar({ embarque: e.target.value })} />
              </Field>
              <div className="field">
                <span className="field__label">Idioma das respostas</span>
                <Segmentado
                  rotulo="Idioma das respostas"
                  valor={form.lang}
                  onChange={(lang) => mudar({ lang })}
                  opcoes={[
                    { valor: 'pt', rotulo: 'Português' },
                    { valor: 'en', rotulo: 'English' },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card
            titulo="Prontidão para exportar"
            acoes={
              avaliacao && (
                <div className="row">
                  {salvaId && (
                    <LinkButton to={`/relatorio/exportacao/${salvaId}`} variante="secondary" tamanho="sm" icone={<Printer size={15} />}>
                      Relatório
                    </LinkButton>
                  )}
                  <Button tamanho="sm" icone={<Save size={15} />} onClick={salvar} carregando={salvando} disabled={!form.laudoId || !!salvaId} title={form.laudoId ? undefined : 'Selecione um laudo para salvar'}>
                    {salvaId ? 'Salva' : 'Salvar avaliação'}
                  </Button>
                </div>
              )
            }
          >
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            {avaliacao && (
              <>
                <Placar resumo={avaliacao.resumo} total={avaliacao.items.length} lang={form.lang} unidade={L.unidade} />
                <Checklist
                  items={avaliacao.items}
                  lang={form.lang}
                  onToggleDoc={(doc, marcado) => {
                    setDocs((d) => (marcado ? [...d, doc] : d.filter((x) => x !== doc)));
                    setSalvaId(null);
                  }}
                />
                {laudo && (
                  <p className="muted pequeno">
                    <FileText size={13} /> Baseado em <Link to={`/laudos/${laudo.id}`}>{laudo.titulo ?? 'laudo'}</Link>. Marque os documentos que você já tem.
                  </p>
                )}
              </>
            )}
            {!avaliacao && !erro && <Carregando />}
            <p className="muted pequeno">Regras ilustrativas; a base real deve ser curada de MAPA, USDA APHIS, UE e GACC.</p>
          </Card>
        </div>

        <Chat
          nome="ExportBot"
          descricao={form.lang === 'pt' ? 'assistente de exportação' : 'export assistant'}
          saudacao={L.saudacao}
          sugestoes={L.sugestoes}
          placeholder={form.lang === 'pt' ? 'Pergunte sobre pendências, pragas, prazo…' : 'Ask about pending items, pests, deadline…'}
          enviar={(mensagem) => api<RespostaChat>('/export/chat', { body: { ...contexto(form), mensagem } })}
        />
      </div>
    </>
  );
}
