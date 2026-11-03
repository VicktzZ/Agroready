# AgroReady — ExportBot + CarbonBot

Projeto 07 · OutTech — Analytics para Agronegócio · Processamento de Linguagem Natural · Fatec Cotia
Equipe: Vitor Hugo Rodrigues dos Santos · Pedro Henrique Araujo — Prof. Braz Izaias da Silva Junior

Front-end em **HTML5, CSS3 e JavaScript** + backend **NestJS** (TypeScript) com **PostgreSQL** via **Prisma**.

## Como executar
Requisitos: Node.js 20+ e um PostgreSQL.

```bash
cd backend
cp .env.example .env        # ajuste DATABASE_URL se necessário
docker compose up -d        # Postgres local (ou use `npx prisma dev` e copie a URL TCP para o .env)
npm install
npx prisma migrate deploy   # cria as tabelas
npm run db:seed             # carrega regras, dicionário do NER, biomas e práticas (ilustrativos)
npm run start:dev
```

- Aplicação: http://localhost:3000 (o Nest serve a pasta `frontend/`)
- API: http://localhost:3000/api · Swagger: http://localhost:3000/api/docs
- Testes unitários (NER, motor de exportação, calculadora de carbono): `npm test`

## Telas
1. **Início** — visão geral e pipeline do projeto.
2. **Laudo (NER)** — envio/colagem do laudo; destaca pragas, doenças, culturas, datas, talhões, nº do laudo e áreas.
3. **ExportBot** — destino × cultura × data de embarque; checklist (atendido / pendente / em risco) e chat com respostas em PT/EN.
4. **CarbonBot** — formulário da propriedade, pontuação de elegibilidade, estimativa de créditos (tCO2e) e chat.
5. **Sobre** — equipe, motivação, roadmap das sprints e cronograma geral (17 semanas).

## API
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/referencias` | Destinos, culturas, biomas, práticas e padrões de certificação |
| POST | `/api/laudos` | Roda o NER sobre `{ texto }` e salva laudo + entidades |
| GET / DELETE | `/api/laudos[/:id]` | Lista, consulta e remove laudos |
| POST | `/api/export/avaliar` | Checklist do laudo × exigências do destino |
| POST | `/api/export/chat` | Pergunta ao ExportBot (PT/EN) |
| CRUD | `/api/export/regras` | Regras de exportação destino × cultura |
| CRUD | `/api/ner/termos` | Dicionário do NER (pragas, doenças, culturas) |
| POST | `/api/carbono/avaliar` | Elegibilidade + estimativa de créditos de carbono |
| POST | `/api/carbono/chat` | Pergunta ao CarbonBot |

## Estrutura
```
frontend/            HTML/CSS/JS (consome a API)
backend/
  prisma/            schema, migrações e seed
  src/ner/           NER (dicionário + regex) e CRUD do dicionário
  src/laudos/        processamento e persistência de laudos
  src/export/        motor de regras e chat do ExportBot, CRUD de regras
  src/carbono/       elegibilidade, calculadora de tCO2e e chat do CarbonBot
```

## Limitações (dados ilustrativos)
- Regras de exportação, critérios de elegibilidade e **fatores de tCO2e/ha/ano são fictícios**, só para o protótipo.
- A estimativa de créditos aplica a prática de maior fator sobre a área produtiva (área − Reserva Legal) e desconta 20% de buffer de não permanência; não soma práticas na mesma área.
- NER por dicionário + expressões regulares; um modelo treinado (ex.: spaCy) pode substituí-lo quando houver laudos anotados.
- Leitura de PDF/imagem (OCR) ainda não é suportada.
