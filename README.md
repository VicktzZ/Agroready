# AgroReady — ExportBot + CarbonBot

Projeto 07 · OutTech — Analytics para Agronegócio · Processamento de Linguagem Natural · Fatec Cotia
Equipe: Vitor Hugo Rodrigues dos Santos · Pedro Henrique Araujo — Prof. Braz Izaias da Silva Junior

Aplicação que lê laudos fitossanitários com PLN e responde duas perguntas do produtor:
**posso exportar?** (ExportBot) e **posso gerar créditos de carbono?** (CarbonBot).

- **Frontend**: React + TypeScript + Vite (`frontend/`)
- **Backend**: NestJS + Prisma + PostgreSQL (`backend/`)

## Como executar
Requisitos: Node.js 20+ e um PostgreSQL (Docker ou `prisma dev`).

```bash
cd backend
cp .env.example .env            # troque JWT_SECRET e ADMIN_PASSWORD
docker compose up -d            # Postgres local…
# …ou, sem Docker: npx prisma dev -d -n agroready   (copie a URL "TCP" de `npx prisma dev ls` para DATABASE_URL)
npm install
npx prisma migrate deploy       # cria as tabelas
npm run db:seed                 # catálogos ilustrativos + conta de administrador
npm run start:dev               # API em http://localhost:3000/api
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev                     # aplicação em http://localhost:5173
```

Para rodar tudo em uma porta só (apresentação): `npm run build` em `frontend/` e reinicie o backend — ele passa a servir
a aplicação em http://localhost:3000.

- Swagger: http://localhost:3000/api/docs
- Testes unitários (PLN, NER, motores dos bots): `npm test` em `backend/`

## Publicar na Vercel
O `vercel.json` da raiz publica os dois lados no mesmo projeto (Vercel Services): `/api/*` vai para `backend/`, o resto para `frontend/`.

1. No projeto da Vercel: **Settings → Build and Deployment → Framework Preset = Services**, Root Directory vazio.
2. **Storage → criar um Postgres** (Neon ou Prisma Postgres) ligado ao projeto: isso cria `DATABASE_URL`.
3. **Settings → Environment Variables**: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. Para acesso público: **Settings → Deployment Protection** só nos previews (ou desligada).
5. Faça o deploy (push na `master`). O script `vercel-build` do backend aplica as migrações e roda o seed.

Se as tabelas não forem criadas no build, rode uma vez na sua máquina, com `DATABASE_URL` apontando para o banco da nuvem:
`npx prisma migrate deploy && npm run db:seed` (em `backend/`).

As rotas do front usam `#` (ex.: `/#/laudos`) para funcionar em hospedagem estática sem configuração extra.

## Contas
- **Administrador**: criado pelo seed com `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `backend/.env`.
  Gerencia usuários (criar, promover, redefinir senha, excluir), regras, dicionário do NER e catálogos.
- **Produtor**: qualquer pessoa pode se cadastrar em "Criar conta". Cada um vê só os próprios laudos e avaliações.

## Telas
| Tela | O que faz |
|---|---|
| Painel | Indicadores, laudos e avaliações recentes, pragas/doenças mais frequentes |
| Laudos | Envio por texto, `.txt` ou PDF; entidades destacadas no texto; resumo por talhão; laudos de exemplo |
| ExportBot | Laudo × destino × cultura → checklist (atendido / pendente / em risco) + chat PT/EN |
| CarbonBot | Dados da propriedade → elegibilidade, estimativa de créditos (tCO2e) + chat |
| Histórico | Avaliações salvas: reabrir, relatório para imprimir/salvar em PDF, excluir |
| Administração | Usuários, regras de exportação, dicionário do NER, catálogos (só administrador) |

Novos usuários veem um tutorial guiado na primeira visita (também em "Tutorial", no menu).

## PLN (implementado em `backend/src/pln` e `backend/src/ner`, sem serviço externo)
- **Tokenização com offsets** e normalização (minúsculas, sem acento).
- **Stemmer** leve para português (inspirado no RSLP): reconhece plural e flexões.
- **Distância de Damerau-Levenshtein**: tolera erro de digitação em palavras longas.
- **NER**: dicionário (pragas, doenças, culturas) + padrões (datas, talhões, nº do laudo, áreas, município, propriedade).
- **Negação** (NegEx simplificado): "ausência de…", "não foi constatada…" não contam como ocorrência.
- **Escopo por talhão**: cada achado é ligado ao talhão; a exportação de soja só olha os talhões de soja.
- **Intenção do chat**: TF-IDF + similaridade do cosseno sobre exemplos em PT e EN. O chat mostra a análise em "Como entendi".

## API (prefixo `/api`, token Bearer exceto em `/auth/entrar` e `/auth/cadastrar`)
| Rota | Descrição |
|---|---|
| `POST /auth/cadastrar` · `POST /auth/entrar` · `GET /auth/eu` | Conta e login |
| `POST /laudos` · `POST /laudos/arquivo` · `GET/DELETE /laudos[/:id]` · `POST /laudos/:id/reprocessar` | Laudos e NER |
| `POST /export/avaliar` · `POST /export/chat` · `…/export/avaliacoes` | ExportBot e avaliações salvas |
| `POST /carbono/avaliar` · `POST /carbono/chat` · `…/carbono/avaliacoes` | CarbonBot e avaliações salvas |
| `GET /painel` · `GET /referencias` | Indicadores e catálogos para os formulários |
| `…/export/regras` · `…/ner/termos` · `…/catalogo/{destinos,culturas,biomas,praticas}` · `…/usuarios` | Administração (escrita só para ADMIN) |

## Limitações
- Regras de exportação, critérios de elegibilidade e **fatores de tCO2e são ilustrativos**, não normas oficiais.
- A estimativa de créditos usa a prática de maior fator sobre a área produtiva e desconta 20% de buffer; não soma práticas.
- NER por regras (dicionário + padrões), não por modelo treinado; um modelo (ex.: spaCy) pode substituí-lo com corpus anotado.
- PDF escaneado e imagem não são lidos (sem OCR).
- Sem limite de tentativas de login: adicionar antes de expor na internet.
