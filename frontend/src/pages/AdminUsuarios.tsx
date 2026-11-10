import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, mensagemDe, useApi } from '../api';
import { useAuth } from '../auth';
import type { Papel, Usuario } from '../types';
import { Button, Card, Confirmar, Estado, Field, fmtDataHora, Modal, PageHeader, useToast } from '../ui';

interface Linha extends Usuario {
  createdAt: string;
  _count: { laudos: number; avaliacoesExportacao: number; avaliacoesCarbono: number };
}
interface Dados {
  totais: { usuarios: number; laudos: number; exportacoes: number; carbono: number; regras: number; termos: number };
  usuarios: Linha[];
}
interface Form {
  id?: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
}

const TOTAIS: [keyof Dados['totais'], string][] = [
  ['usuarios', 'usuários'],
  ['laudos', 'laudos processados'],
  ['exportacoes', 'avaliações de exportação'],
  ['carbono', 'avaliações de carbono'],
  ['regras', 'regras de exportação'],
  ['termos', 'termos no dicionário'],
];

/** Administração de usuários + visão geral do sistema (todas as contas). */
export function AdminUsuarios() {
  const { usuario: eu } = useAuth();
  const avisar = useToast();
  const dados = useApi<Dados>('/usuarios');
  const [form, setForm] = useState<Form | null>(null);
  const [excluir, setExcluir] = useState<Linha | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const mudar = (parte: Partial<Form>) => setForm((f) => f && { ...f, ...parte });

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    try {
      await acao();
      avisar('ok', sucesso);
      setForm(null);
      dados.recarregar();
    } catch (e) {
      avisar('erro', mensagemDe(e));
    } finally {
      setOcupado(false);
      setExcluir(null);
    }
  }

  function salvar() {
    if (!form) return;
    const { id, nome, email, senha, papel } = form;
    void executar(
      () =>
        id
          ? api(`/usuarios/${id}`, { method: 'PATCH', body: { nome, papel, senha: senha || undefined } })
          : api('/usuarios', { body: { nome, email, senha, papel } }),
      id ? 'Usuário atualizado.' : 'Usuário criado.',
    );
  }

  return (
    <>
      <PageHeader
        titulo="Usuários"
        sub="Crie contas, defina quem é administrador, redefina senhas e acompanhe o uso do sistema."
        acoes={
          <Button icone={<Plus size={17} />} onClick={() => setForm({ nome: '', email: '', senha: '', papel: 'PRODUTOR' })}>
            Novo usuário
          </Button>
        }
      />
      <Estado {...dados}>
        {(d) => (
          <>
            <Card titulo="Visão geral do sistema" sub="Somando todas as contas.">
              <div className="conta">
                {TOTAIS.map(([chave, rotulo]) => (
                  <div key={chave}>
                    <b>{d.totais[chave]}</b>
                    <span>{rotulo}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Papel</th>
                    <th>Laudos</th>
                    <th>Avaliações</th>
                    <th>Criado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>{u.nome}</b> {u.id === eu?.id && <span className="badge">você</span>}
                        <span className="sub">{u.email}</span>
                      </td>
                      <td>
                        <span className={u.papel === 'ADMIN' ? 'badge badge--accent' : 'badge'}>{u.papel === 'ADMIN' ? 'Administrador' : 'Produtor'}</span>
                      </td>
                      <td>{u._count.laudos}</td>
                      <td>{u._count.avaliacoesExportacao + u._count.avaliacoesCarbono}</td>
                      <td className="nowrap">{fmtDataHora(u.createdAt)}</td>
                      <td>
                        <div className="acoes">
                          <button type="button" className="icon-btn" aria-label={`Editar ${u.nome}`} title="Editar" onClick={() => setForm({ id: u.id, nome: u.nome, email: u.email, senha: '', papel: u.papel })}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn icon-btn--perigo" aria-label={`Excluir ${u.nome}`} title={u.id === eu?.id ? 'Você não pode excluir a própria conta' : 'Excluir'} disabled={u.id === eu?.id} onClick={() => setExcluir(u)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Estado>

      <Modal
        aberto={!!form}
        titulo={form?.id ? 'Editar usuário' : 'Novo usuário'}
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
        {form && (
          <>
            <Field rotulo="Nome">
              <input value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} required maxLength={80} />
            </Field>
            <Field rotulo="E-mail" dica={form.id ? 'O e-mail não pode ser alterado.' : undefined}>
              <input type="email" value={form.email} onChange={(e) => mudar({ email: e.target.value })} required disabled={!!form.id} autoComplete="off" />
            </Field>
            <Field rotulo="Papel" dica={form.id === eu?.id ? 'Você não pode remover o seu próprio acesso de administrador.' : 'Administradores gerenciam usuários, regras, dicionário e catálogos.'}>
              <select value={form.papel} onChange={(e) => mudar({ papel: e.target.value as Papel })} disabled={form.id === eu?.id}>
                <option value="PRODUTOR">Produtor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Field>
            <Field rotulo={form.id ? 'Nova senha (opcional)' : 'Senha'} dica={form.id ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 8 caracteres.'}>
              <input type="password" value={form.senha} onChange={(e) => mudar({ senha: e.target.value })} required={!form.id} minLength={8} maxLength={72} autoComplete="new-password" />
            </Field>
          </>
        )}
      </Modal>

      <Confirmar
        aberto={!!excluir}
        titulo="Excluir usuário?"
        carregando={ocupado}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => excluir && void executar(() => api(`/usuarios/${excluir.id}`, { method: 'DELETE' }), 'Usuário excluído.')}
      >
        {excluir?.nome} ({excluir?.email}) perderá o acesso, e os {excluir?._count.laudos} laudo(s) e avaliações dessa conta serão excluídos. Esta ação não pode ser
        desfeita.
      </Confirmar>
    </>
  );
}
