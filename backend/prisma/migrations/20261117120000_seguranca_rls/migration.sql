-- Segurança: o app acessa o banco só pelo Prisma (papel dono das tabelas, que ignora RLS).
-- Em hospedagens que expõem o schema public por uma API REST (ex.: Supabase, com as chaves anon/authenticated),
-- tabelas sem RLS ficam legíveis por quem tem a chave pública — inclusive "Usuario" (hashes de senha).
-- Ligar o RLS sem criar política nenhuma nega todo acesso por esses papéis; o Prisma continua funcionando.

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TermoNer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Destino" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cultura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegraExportacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bioma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PraticaCarbono" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Laudo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvaliacaoExportacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AvaliacaoCarbono" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Cinto e suspensório: tira também as permissões dos papéis da API, quando eles existem (Supabase).
-- Em um Postgres comum os papéis não existem e nada acontece.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
  END IF;
END
$$;
