import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './auth';
import { AdminCatalogos } from './pages/AdminCatalogos';
import { AdminDicionario } from './pages/AdminDicionario';
import { AdminRegras } from './pages/AdminRegras';
import { AdminUsuarios } from './pages/AdminUsuarios';
import { CarbonBot } from './pages/CarbonBot';
import { Entrar } from './pages/Entrar';
import { ExportBot } from './pages/ExportBot';
import { Historico } from './pages/Historico';
import { LaudoDetalhe } from './pages/LaudoDetalhe';
import { LaudoNovo } from './pages/LaudoNovo';
import { Laudos } from './pages/Laudos';
import { Painel } from './pages/Painel';
import { RelatorioCarbono, RelatorioExportacao } from './pages/Relatorio';
import { Sobre } from './pages/Sobre';
import { Shell } from './Shell';
import { Carregando, LinkButton, Vazio } from './ui';

/** Só deixa passar quem está logado (e, se pedido, quem é administrador). */
function Protegido({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;
  if (admin && usuario.papel !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function NaoEncontrada() {
  return (
    <Vazio icone={<SearchX size={26} />} titulo="Página não encontrada" acao={<LinkButton to="/">Ir para o painel</LinkButton>}>
      O endereço não existe ou foi movido.
    </Vazio>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/cadastro" element={<Entrar cadastro />} />

      <Route
        element={
          <Protegido>
            <Shell />
          </Protegido>
        }
      >
        <Route index element={<Painel />} />
        <Route path="laudos" element={<Laudos />} />
        <Route path="laudos/novo" element={<LaudoNovo />} />
        <Route path="laudos/:id" element={<LaudoDetalhe />} />
        <Route path="exportacao" element={<ExportBot />} />
        <Route path="carbono" element={<CarbonBot />} />
        <Route path="historico" element={<Historico />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="admin/regras" element={<Protegido admin><AdminRegras /></Protegido>} />
        <Route path="admin/dicionario" element={<Protegido admin><AdminDicionario /></Protegido>} />
        <Route path="admin/catalogos" element={<Protegido admin><AdminCatalogos /></Protegido>} />
        <Route path="admin/usuarios" element={<Protegido admin><AdminUsuarios /></Protegido>} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>

      {/* Relatórios ficam fora do layout: página limpa para imprimir */}
      <Route path="/relatorio/exportacao/:id" element={<Protegido><RelatorioExportacao /></Protegido>} />
      <Route path="/relatorio/carbono/:id" element={<Protegido><RelatorioCarbono /></Protegido>} />
    </Routes>
  );
}
