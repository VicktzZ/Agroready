import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { Aviso, Card, PageHeader } from '../ui';

const ETAPAS: [string, string][] = [
  ['Laudo', 'texto, .txt ou PDF'],
  ['Tokenização', 'palavras com posição no texto'],
  ['Normalização', 'minúsculas, sem acento'],
  ['NER', 'dicionário + padrões + negação'],
  ['Motor de regras', 'ExportBot · CarbonBot'],
  ['Resposta', 'intenção por TF-IDF · PT/EN'],
];

const TECNICAS: [string, string][] = [
  ['Tokenização com offsets', 'Cada palavra guarda onde começa e termina no texto original; é o que permite destacar as entidades no laudo.'],
  ['Stemming (radical)', '“pendente”, “pendências” e “pendentes” viram o mesmo radical. Vale para reconhecer plural no laudo e variações da pergunta no chat.'],
  ['Distância de edição', 'Damerau-Levenshtein tolera erro de digitação em palavras longas: “ferugem asiatica” ainda é ferrugem-asiática.'],
  ['Negação (NegEx simplificado)', '“Ausência de mosca-branca” ou “não foi constatada…” não contam como ocorrência, inclusive em enumerações.'],
  ['Escopo por talhão', 'Cada praga ou doença é ligada ao talhão em que aparece; a exportação de soja só olha os talhões de soja.'],
  ['Intenção por TF-IDF + cosseno', 'A pergunta é comparada com exemplos de cada intenção; a mais parecida vence, se passar do limiar. O chat mostra a análise em “Como entendi”.'],
];

export function Sobre() {
  return (
    <>
      <PageHeader titulo="Sobre o projeto" sub="Projeto 07 · OutTech — Analytics para Agronegócio · Processamento de Linguagem Natural · Fatec Cotia" />

      <Card titulo="Como o AgroReady funciona" sub="Um único pipeline de PLN alimenta os dois assistentes; só a base de regras muda.">
        <div className="pipeline">
          {ETAPAS.map(([nome, detalhe], i) => (
            <Fragment key={nome}>
              {i > 0 && <ChevronRight size={18} />}
              <div className="etapa">
                {nome}
                <small>{detalhe}</small>
              </div>
            </Fragment>
          ))}
        </div>
      </Card>

      <div className="cols-2">
        <Card titulo="Técnicas de PLN" sub="Implementadas no backend NestJS, sem serviço externo.">
          <dl className="resumo" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: '2px 0' }}>
            {TECNICAS.map(([nome, texto]) => (
              <Fragment key={nome}>
                <dt style={{ color: 'var(--text)', fontSize: 14 }}>{nome}</dt>
                <dd className="muted" style={{ marginBottom: 12 }}>
                  {texto}
                </dd>
              </Fragment>
            ))}
          </dl>
        </Card>

        <div className="stack">
          <Card titulo="Motivação">
            <p>
              Exportar e acessar o mercado de carbono exigem checagens manuais, lentas e sujeitas a erro: ler o laudo, conferir exigências de cada
              país, reunir documentos, verificar regularidade ambiental. O AgroReady automatiza as duas frentes a partir do mesmo laudo.
            </p>
          </Card>
          <Card titulo="Equipe">
            <p>
              Vitor Hugo Rodrigues dos Santos · Pedro Henrique Araujo
              <br />
              <span className="muted">Prof. Braz Izaias da Silva Junior</span>
            </p>
            <div className="pills">
              {['React', 'TypeScript', 'Vite', 'NestJS', 'Prisma', 'PostgreSQL'].map((t) => (
                <span key={t} className="pill">
                  {t}
                </span>
              ))}
            </div>
          </Card>
          <Aviso tipo="warn">
            <b>Dados ilustrativos.</b> Regras de exportação, critérios de elegibilidade e fatores de tCO2e servem para demonstrar o sistema; não são
            normas oficiais. PDF escaneado não é lido (sem OCR).
          </Aviso>
        </div>
      </div>
    </>
  );
}
