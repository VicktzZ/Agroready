import { BookOpen, CircleHelp, Database, FileText, History, Info, LayoutDashboard, Leaf, LogOut, Menu, Moon, Scale, Ship, Sprout, Sun, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from './auth';
import { Tutorial } from './components/Tutorial';
import type { Passo } from './components/Tutorial';
import { cx } from './ui';

const PRINCIPAL = [
  { to: '/', rotulo: 'Painel', icone: LayoutDashboard, fim: true },
  { to: '/laudos', rotulo: 'Laudos', icone: FileText },
  { to: '/exportacao', rotulo: 'ExportBot', icone: Ship },
  { to: '/carbono', rotulo: 'CarbonBot', icone: Leaf },
  { to: '/historico', rotulo: 'Histórico', icone: History },
];
const ADMIN = [
  { to: '/admin/usuarios', rotulo: 'Usuários', icone: Users },
  { to: '/admin/regras', rotulo: 'Regras de exportação', icone: Scale },
  { to: '/admin/dicionario', rotulo: 'Dicionário do NER', icone: BookOpen },
  { to: '/admin/catalogos', rotulo: 'Catálogos', icone: Database },
];

// Tutorial de primeira visita. Os alvos são os itens do menu (atributo data-tour = rota).
const PASSOS: Passo[] = [
  { titulo: 'Bem-vindo ao AgroReady', texto: 'Em menos de um minuto você conhece o caminho: laudo → exportação → carbono.' },
  { alvo: '[data-tour="/laudos"]', titulo: '1. Envie um laudo', texto: 'Cole o texto ou envie .txt/PDF. O sistema destaca pragas, doenças, talhões e datas. Há laudos de exemplo prontos para testar.' },
  { alvo: '[data-tour="/exportacao"]', titulo: '2. ExportBot', texto: 'Escolha destino e cultura: a checklist mostra o que está atendido, pendente ou em risco, e o chat responde em português ou inglês.' },
  { alvo: '[data-tour="/carbono"]', titulo: '3. CarbonBot', texto: 'Informe os dados da propriedade para saber se ela pode gerar créditos de carbono — e quantos.' },
  { alvo: '[data-tour="/historico"]', titulo: 'Histórico e relatórios', texto: 'As avaliações que você salvar ficam aqui. Reabra, imprima ou salve em PDF.' },
  { alvo: '[data-tour="/"]', titulo: 'Painel', texto: 'Resumo dos seus laudos, avaliações e das pragas mais frequentes.' },
];
const PASSO_ADMIN: Passo = {
  alvo: '[data-tour="/admin/usuarios"]',
  titulo: 'Administração',
  texto: 'Como administrador, você gerencia usuários, regras de exportação, o dicionário do NER e os catálogos.',
};
const PASSO_FINAL: Passo = { titulo: 'Tudo pronto', texto: 'Comece enviando um laudo — ou use um dos exemplos. Para rever este tutorial, clique em “Tutorial” no menu.' };

export function Marca() {
  return (
    <>
      <span className="brand__mark">
        <Sprout size={21} />
      </span>
      <span>
        <strong>AgroReady</strong>
        <small>Analytics para Agronegócio</small>
      </span>
    </>
  );
}

function useTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem('agroready-tema', tema);
    } catch {
      /* armazenamento indisponível: o tema vale só nesta visita */
    }
  }, [tema]);
  return [tema, () => setTema((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
}

/** Layout das telas internas: menu lateral (gaveta no celular) + conteúdo. */
export function Shell() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [tour, setTour] = useState(false);
  const [tema, alternarTema] = useTema();
  const { pathname } = useLocation();
  const chaveTour = `agroready-tutorial-${usuario?.id}`;

  useEffect(() => setAberto(false), [pathname]); // navegar fecha a gaveta

  // primeira visita deste usuário neste navegador: abre o tutorial
  useEffect(() => {
    try {
      if (usuario && !localStorage.getItem(chaveTour)) setTour(true);
    } catch {
      /* sem armazenamento: não insiste no tutorial */
    }
  }, [usuario, chaveTour]);

  const fimDoTour = useCallback(
    (acao: 'fim' | 'pular') => {
      try {
        localStorage.setItem(chaveTour, '1');
      } catch {
        /* sem armazenamento */
      }
      setTour(false);
      if (acao === 'fim') navegar('/laudos/novo');
    },
    [chaveTour, navegar],
  );

  if (!usuario) return null;
  const admin = usuario.papel === 'ADMIN';
  const iniciais = usuario.nome
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const itens = (lista: typeof PRINCIPAL) =>
    lista.map(({ to, rotulo, icone: Icone, fim }) => (
      <NavLink key={to} to={to} end={fim} data-tour={to}>
        <Icone size={18} />
        {rotulo}
      </NavLink>
    ));

  return (
    <div className="app">
      {aberto && <button type="button" className="scrim" aria-label="Fechar menu" onClick={() => setAberto(false)} />}
      <aside className={cx('side', aberto && 'side--aberta')}>
        <Link to="/" className="brand">
          <Marca />
        </Link>
        <nav className="nav" aria-label="Principal">
          {itens(PRINCIPAL)}
        </nav>
        {admin && (
          <nav className="nav" aria-label="Administração">
            <span className="nav__titulo">Administração</span>
            {itens(ADMIN)}
          </nav>
        )}
        <div className="side__foot">
          <nav className="nav" aria-label="Ajuda">
            <button type="button" onClick={() => setTour(true)}>
              <CircleHelp size={18} />
              Tutorial
            </button>
            <NavLink to="/sobre">
              <Info size={18} />
              Sobre o projeto
            </NavLink>
          </nav>
          <div className="user">
            <span className="avatar">{iniciais}</span>
            <div>
              <div className="user__nome" title={usuario.email}>
                {usuario.nome}
              </div>
              <div className="user__papel">{admin ? 'Administrador' : 'Produtor'}</div>
            </div>
            <button type="button" className="icon-btn" onClick={alternarTema} aria-label={tema === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} title="Alternar tema">
              {tema === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button type="button" className="icon-btn" onClick={sair} aria-label="Sair" title="Sair">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div>
        <div className="topbar">
          <button type="button" className="icon-btn" onClick={() => setAberto(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          AgroReady
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>

      {tour && <Tutorial passos={[...PASSOS, ...(admin ? [PASSO_ADMIN] : []), PASSO_FINAL]} rotuloFinal="Enviar um laudo" onFim={fimDoTour} />}
    </div>
  );
}
