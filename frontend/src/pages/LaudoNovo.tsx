import { ArrowLeft, Download, FileText, FileUp, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, mensagemDe } from '../api';
import { LAUDOS_EXEMPLO } from '../exemplos';
import type { LaudoExemplo } from '../exemplos';
import type { Laudo } from '../types';
import { Aviso, Button, Card, cx, Field, PageHeader, useToast } from '../ui';

const LIMITE_ARQUIVO = 5 * 1024 * 1024;

export function LaudoNovo() {
  const navegar = useNavigate();
  const avisar = useToast();
  const [texto, setTexto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [sobre, setSobre] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exemplo, setExemplo] = useState<string | null>(null);
  const campoTexto = useRef<HTMLTextAreaElement>(null);

  function usarExemplo(ex: LaudoExemplo) {
    setArquivo(null);
    setTexto(ex.texto);
    setTitulo('');
    setExemplo(ex.id);
    setErro(null);
    campoTexto.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    if (!/\.(txt|pdf)$/i.test(f.name)) return setErro('Formato não suportado. Envie um arquivo .txt ou um PDF com texto selecionável.');
    if (f.size > LIMITE_ARQUIVO) return setErro('Arquivo maior que 5 MB.');
    setArquivo(f);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setSobre(false);
    escolher(e.dataTransfer.files[0]);
  }

  async function analisar(e: FormEvent) {
    e.preventDefault();
    if (!arquivo && !texto.trim()) return setErro('Envie um arquivo, cole o texto do laudo ou use o exemplo.');
    setErro(null);
    setEnviando(true);
    try {
      let laudo: Laudo;
      if (arquivo) {
        const form = new FormData();
        form.append('arquivo', arquivo);
        laudo = await api<Laudo>('/laudos/arquivo', { form });
      } else {
        laudo = await api<Laudo>('/laudos', { body: { texto: texto.trim(), titulo: titulo.trim() || undefined } });
      }
      avisar('ok', `${laudo.entidades.items.length} entidade(s) encontrada(s) no laudo.`);
      navegar(`/laudos/${laudo.id}`);
    } catch (err) {
      setErro(mensagemDe(err));
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader
        voltar={
          <Link to="/laudos" className="voltar">
            <ArrowLeft size={15} /> Laudos
          </Link>
        }
        titulo="Novo laudo"
        sub="Envie o arquivo ou cole o texto. O NER identifica pragas, doenças, culturas, talhões, datas e áreas."
      />
      <Card titulo="Não tem um laudo em mãos?" sub="Escolha um exemplo para preencher o texto abaixo — ou baixe o .txt e envie como arquivo.">
        <div className="exemplos">
          {LAUDOS_EXEMPLO.map((ex) => (
            <div key={ex.id} className={cx('exemplo', exemplo === ex.id && 'exemplo--ativo')}>
              <button type="button" className="exemplo__usar" onClick={() => usarExemplo(ex)} aria-pressed={exemplo === ex.id}>
                <strong>{ex.titulo}</strong>
                <span>{ex.descricao}</span>
                <span className="pills">
                  {ex.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </span>
              </button>
              <a
                className="icon-btn"
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(ex.texto)}`}
                download={`laudo-exemplo-${ex.id}.txt`}
                title="Baixar como .txt"
                aria-label={`Baixar “${ex.titulo}” como .txt`}
              >
                <Download size={16} />
              </a>
            </div>
          ))}
        </div>
      </Card>

      <form className="cols-2" onSubmit={analisar}>
        <Card titulo="Arquivo" sub=".txt ou PDF com texto selecionável, até 5 MB.">
          {arquivo ? (
            <div className="check">
              <FileText size={20} />
              <span>
                <b>{arquivo.name}</b>
                <small>{(arquivo.size / 1024).toFixed(0)} KB</small>
              </span>
              <button type="button" className="icon-btn" onClick={() => setArquivo(null)} aria-label="Remover arquivo" style={{ marginLeft: 'auto' }}>
                <X size={17} />
              </button>
            </div>
          ) : (
            <label
              className={cx('drop', sobre && 'drop--sobre')}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(true);
              }}
              onDragLeave={() => setSobre(false)}
              onDrop={soltar}
            >
              <input type="file" accept=".txt,.pdf,text/plain,application/pdf" hidden onChange={(e) => escolher(e.target.files?.[0])} />
              <FileUp size={30} />
              <strong>Arraste o laudo aqui</strong>
              <span>ou clique para escolher o arquivo</span>
            </label>
          )}
          <Aviso>PDF escaneado (imagem) não é lido: não há OCR. Nesse caso, cole o texto ao lado.</Aviso>
        </Card>

        <Card titulo="Ou cole o texto">
          <Field rotulo="Texto do laudo">
            <textarea
              ref={campoTexto}
              rows={11}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setExemplo(null);
              }}
              placeholder="Cole aqui o texto do laudo fitossanitário…"
              disabled={!!arquivo}
              maxLength={50000}
            />
          </Field>
          <Field rotulo="Nome do laudo (opcional)" dica="Se ficar vazio, usamos a propriedade encontrada no texto.">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} disabled={!!arquivo} placeholder="Ex.: Fazenda Santa Clara — safra 2026" />
          </Field>
        </Card>

        <div className="stack" style={{ gridColumn: '1 / -1' }}>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="row">
            <Button type="submit" carregando={enviando} icone={<Sparkles size={17} />}>
              Analisar laudo
            </Button>
            <span className="muted pequeno">{arquivo ? 'O arquivo será lido no servidor.' : 'O texto colado é analisado como está.'}</span>
          </div>
        </div>
      </form>
    </>
  );
}
