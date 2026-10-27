# AgroReady — Front-end (Sprint Zero)

Projeto 07 · OutTech — Analytics para Agronegócio · Processamento de Linguagem Natural · Fatec Cotia
Equipe: Vitor Hugo Rodrigues dos Santos · Pedro Henrique Araujo — Prof. Braz Izaias da Silva Junior

Front-end do AgroReady (ExportBot + CarbonBot), desenvolvido em **HTML5, CSS3 e JavaScript** (sem ferramentas NOCODE).

## Como executar
Basta abrir `index.html` no navegador (não precisa de servidor nem de instalação).
Opcional: `python3 -m http.server 8000` e acessar http://localhost:8000.

## Telas
1. **Início** — visão geral e pipeline do projeto.
2. **Laudo (NER)** — envio/colagem do laudo; destaca pragas, doenças, culturas, datas, talhões, nº do laudo e áreas.
3. **ExportBot** — destino × cultura × data de embarque; checklist (atendido / pendente / em risco) e chat com respostas em PT/EN.
4. **CarbonBot** — formulário da propriedade, pontuação de elegibilidade e chat.
5. **Sobre** — equipe, motivação, roadmap das sprints e cronograma geral (17 semanas).

## Estrutura
```
index.html
css/style.css
js/data.js   dados e regras ilustrativas (virão do PostgreSQL na Sprint 1)
js/ner.js    NER simulado (dicionários + regex; versão final: spaCy)
js/chat.js   componente de chat reutilizável
js/app.js    rotas, estado e telas
```

## O que é simulado nesta sprint
NER, motor de regras e tradução rodam no navegador para validar a experiência do usuário. As regras de exportação e de carbono são **ilustrativas**. Na Sprint 1 (20/10) entram o diagrama ER e o banco PostgreSQL com CRUD; na Sprint 2, o backend FastAPI.
