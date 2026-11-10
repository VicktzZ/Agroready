import { Eye, EyeOff, FileSearch, Leaf, Ship } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { mensagemDe } from '../api';
import { useAuth } from '../auth';
import { Marca } from '../Shell';
import { Aviso, Button, Carregando, Field } from '../ui';

/** Login e cadastro (mesma tela; `cadastro` troca os campos). */
export function Entrar({ cadastro = false }: { cadastro?: boolean }) {
  const { usuario, carregando, entrar, cadastrar } = useAuth();
  const local = useLocation();
  const destino = (local.state as { de?: string } | null)?.de ?? '/';
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <Carregando />;
  if (usuario) return <Navigate to={destino} replace />; // também cobre o pós-login

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await (cadastro ? cadastrar(nome, email, senha) : entrar(email, senha));
    } catch (err) {
      setErro(mensagemDe(err));
      setEnviando(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth__marca">
        <div className="brand">
          <Marca />
        </div>
        <div>
          <h1>Do laudo ao embarque, sem retrabalho.</h1>
          <p>
            O AgroReady lê o laudo fitossanitário com Processamento de Linguagem Natural e mostra o que falta para exportar e para
            acessar o mercado de carbono.
          </p>
        </div>
        <ul className="auth__pontos">
          <li>
            <FileSearch size={20} />
            <span>
              <b>Leitura automática do laudo</b>
              Pragas, doenças, talhões e datas extraídos do texto ou do PDF.
            </span>
          </li>
          <li>
            <Ship size={20} />
            <span>
              <b>ExportBot</b>
              Checklist por destino e cultura, com respostas em português ou inglês.
            </span>
          </li>
          <li>
            <Leaf size={20} />
            <span>
              <b>CarbonBot</b>
              Elegibilidade da propriedade e estimativa de créditos de carbono.
            </span>
          </li>
        </ul>
      </aside>

      <main className="auth__form">
        <div className="auth__card">
          <div>
            <h1>{cadastro ? 'Criar conta' : 'Entrar'}</h1>
            <p className="muted">{cadastro ? 'Leva menos de um minuto.' : 'Acesse seus laudos e avaliações.'}</p>
          </div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <form onSubmit={enviar}>
            {cadastro && (
              <Field rotulo="Nome">
                <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} autoComplete="name" autoFocus />
              </Field>
            )}
            <Field rotulo="E-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus={!cadastro} />
            </Field>
            <Field rotulo="Senha" dica={cadastro ? 'Mínimo de 8 caracteres.' : undefined}>
              <span className="senha">
                <input
                  type={verSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={cadastro ? 8 : undefined}
                  maxLength={72}
                  autoComplete={cadastro ? 'new-password' : 'current-password'}
                />
                <button type="button" className="icon-btn" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </Field>
            <Button type="submit" bloco carregando={enviando}>
              {cadastro ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>
          <p className="muted pequeno">
            {cadastro ? 'Já tem conta? ' : 'Ainda não tem conta? '}
            <Link to={cadastro ? '/entrar' : '/cadastro'} state={local.state} onClick={() => setErro(null)}>
              {cadastro ? 'Entrar' : 'Criar conta'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
