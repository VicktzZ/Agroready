import { FileText, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useApi } from '../api';
import { Termos } from '../components/LaudoTexto';
import type { LaudoItem } from '../types';
import { Estado, fmtDataHora, fmtDia, LinkButton, PageHeader, Vazio } from '../ui';

export const ORIGEM: Record<string, string> = { texto: 'Texto colado', txt: 'Arquivo .txt', pdf: 'PDF' };

export function Laudos() {
  const laudos = useApi<LaudoItem[]>('/laudos');
  const navegar = useNavigate();

  return (
    <>
      <PageHeader
        titulo="Laudos"
        sub="Laudos fitossanitários enviados e o que o NER encontrou em cada um."
        acoes={
          <LinkButton to="/laudos/novo" icone={<Plus size={17} />}>
            Novo laudo
          </LinkButton>
        }
      />
      <Estado {...laudos}>
        {(lista) =>
          lista.length === 0 ? (
            <section className="card">
              <Vazio icone={<FileText size={26} />} titulo="Nenhum laudo ainda" acao={<LinkButton to="/laudos/novo" icone={<Plus size={17} />}>Enviar laudo</LinkButton>}>
                Envie um laudo fitossanitário para extrair pragas, doenças, talhões e datas automaticamente.
              </Vazio>
            </section>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Laudo</th>
                    <th>Culturas</th>
                    <th>Achados</th>
                    <th>Última inspeção</th>
                    <th>Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((l) => (
                    <tr key={l.id} className="clicavel" onClick={() => navegar(`/laudos/${l.id}`)}>
                      <td>
                        <Link to={`/laudos/${l.id}`} onClick={(e) => e.stopPropagation()}>
                          <b>{l.titulo ?? 'Laudo sem título'}</b>
                        </Link>
                        <span className="sub">
                          {l.numero ? `Nº ${l.numero} · ` : ''}
                          {ORIGEM[l.origem] ?? l.origem}
                        </span>
                      </td>
                      <td>
                        <Termos tipo="CULTURA" itens={l.resumo.culturas} vazio="—" />
                      </td>
                      <td>
                        {l.resumo.pragas.length} praga(s) · {l.resumo.doencas.length} doença(s)
                        <span className="sub">{l.resumo.talhoes} talhão(ões)</span>
                      </td>
                      <td className="nowrap">{fmtDia(l.resumo.ultimaInspecao)}</td>
                      <td className="nowrap">{fmtDataHora(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Estado>
    </>
  );
}
