/* Textos bilíngues do ExportBot (checklist e chat).
   ponytail: textos fixos PT/EN; tradução automática (ex.: MarianMT) só se surgir conteúdo livre a traduzir. */

export type Lang = 'pt' | 'en';

const pt = {
  item: {
    laudo: 'Laudo fitossanitário emitido',
    semLaudo: 'Nenhum laudo selecionado.',
    numero: (n: string) => `Nº ${n}`,
    semNumero: 'Número do laudo não identificado no texto.',
    cultura: (c: string) => `Laudo cobre a cultura (${c})`,
    aguardando: 'Aguardando laudo.',
    culturaOk: 'Cultura encontrada no laudo.',
    culturaFalta: 'O laudo não menciona esta cultura.',
    prazo: (max: number) => `Inspeção até ${max} dias antes do embarque`,
    semInspecao: 'Data de inspeção não identificada no laudo.',
    semEmbarque: 'Informe a data prevista de embarque.',
    embarqueAntes: 'Embarque anterior à inspeção.',
    dias: (d: number) => `Inspeção ${d} dia(s) antes do embarque.`,
    ausencia: (p: string) => `Ausência de ${p}`,
    detectado: (onde: string) => `Detectado no laudo${onde && ` (${onde})`} — tratar e comprovar antes do embarque.`,
    naoDetectado: 'Não detectado no laudo.',
    docOk: 'Confirmado pelo produtor.',
    docPendente: 'Confirmação manual pendente.',
  },
  chat: {
    semLaudo: 'Ainda não há laudo selecionado. Envie um em **Laudos** e escolha-o aqui para eu cruzar o conteúdo com as exigências do destino.',
    semRegra: (cult: string, dest: string) => `Não há regra cadastrada para **${cult} → ${dest}**. Um administrador pode cadastrá-la em Administração › Regras.`,
    resumo: (ok: number, pend: number, risco: number, cult: string, dest: string) =>
      `Para **${cult} → ${dest}**: **${ok}** exigência(s) atendida(s), **${pend}** pendente(s) e **${risco}** em risco.`,
    situacao: {
      ok: 'Tudo atendido: o laudo está pronto para este destino.',
      pendente: 'Há pendências a resolver, mas nenhum impedimento detectado.',
      risco: 'Há itens em risco que impedem o embarque como está.',
    },
    pendencias: 'O que resolver:',
    nadaPendente: 'Nenhuma pendência — tudo atendido para este destino.',
    atendido: 'Já atendido:',
    nadaAtendido: 'Nenhuma exigência atendida ainda.',
    entidades: (pragas: string, doencas: string, talhoes: string) =>
      `No laudo encontrei — pragas: **${pragas}**; doenças: **${doencas}**; talhões: **${talhoes}**.`,
    negadas: (n: string) => ` Citadas como ausentes: ${n}.`,
    nenhuma: 'nenhuma',
    documentos: 'Documentos exigidos para este destino:',
    semDocumentos: 'Esta regra não exige documentos adicionais.',
    prazo: (dias: number, max: number) => `A inspeção mais recente foi **${dias}** dia(s) antes do embarque; o máximo aceito é **${max}**.`,
    prazoOk: ' Está dentro do prazo.',
    prazoVencido: ' Está fora do prazo: é preciso nova inspeção.',
    semEmbarque: 'Informe a data prevista de embarque para eu avaliar o prazo da inspeção.',
    semInspecao: 'Não identifiquei a data de inspeção no laudo.',
    regra: (cult: string, dest: string, max: number) => `Para **${cult} → ${dest}** a inspeção deve ter no máximo **${max}** dias na data do embarque.`,
    regraBloqueios: (b: string) => ` Impedem o embarque: **${b}**.`,
    regraDocs: (d: string) => ` Documentos exigidos: ${d}.`,
    termo: {
      bloqueia: (t: string, cult: string, dest: string, onde: string) =>
        `**${t}** é restrição para ${cult} → ${dest} e **foi detectado** no laudo${onde && ` (${onde})`}. É preciso tratar e comprovar antes do embarque.`,
      restritoAusente: (t: string, cult: string, dest: string) =>
        `**${t}** é restrição para ${cult} → ${dest}, mas **não foi detectado** no laudo: requisito atendido.`,
      detectadoLivre: (t: string, cult: string, dest: string, onde: string) =>
        `**${t}** aparece no laudo${onde && ` (${onde})`}, mas **não é restrição** cadastrada para ${cult} → ${dest}.`,
      nada: (t: string, cult: string, dest: string) => `**${t}** não aparece no laudo e não é restrição cadastrada para ${cult} → ${dest}.`,
      restritoSemLaudo: (t: string, cult: string, dest: string) =>
        `**${t}** é restrição para ${cult} → ${dest}. Selecione um laudo para eu verificar se foi detectado.`,
      livreSemLaudo: (t: string, cult: string, dest: string) => `**${t}** não é restrição cadastrada para ${cult} → ${dest}.`,
    },
    saudacao: 'Olá! Sou o ExportBot. Cruzo o seu laudo com as exigências do país de destino. Pergunte, por exemplo, “o que está pendente?”.',
    ajuda: 'Posso responder sobre **pendências**, **pragas e doenças** do laudo, **documentos**, **prazo** da inspeção, **exigências do destino** e o que já está **atendido**. Você também pode citar outro destino, cultura ou uma praga na pergunta.',
    agradecimento: 'De nada! Se precisar, é só perguntar.',
    naoEntendi: 'Não entendi bem. Tente: “o que está pendente?”, “quais pragas?”, “documentos”, “prazo” ou “o que a China exige?”.',
  },
};

export type Textos = typeof pt;

const en: Textos = {
  item: {
    laudo: 'Phytosanitary report issued',
    semLaudo: 'No report selected.',
    numero: (n) => `No. ${n}`,
    semNumero: 'Report number not found in the text.',
    cultura: (c) => `Report covers the crop (${c})`,
    aguardando: 'Waiting for the report.',
    culturaOk: 'Crop found in the report.',
    culturaFalta: 'The report does not mention this crop.',
    prazo: (max) => `Inspection up to ${max} days before shipment`,
    semInspecao: 'Inspection date not found in the report.',
    semEmbarque: 'Enter the planned shipment date.',
    embarqueAntes: 'Shipment is earlier than the inspection.',
    dias: (d) => `Inspection ${d} day(s) before shipment.`,
    ausencia: (p) => `Absence of ${p}`,
    detectado: (onde) => `Detected in the report${onde && ` (${onde})`} — treat and prove before shipment.`,
    naoDetectado: 'Not detected in the report.',
    docOk: 'Confirmed by the producer.',
    docPendente: 'Manual confirmation pending.',
  },
  chat: {
    semLaudo: 'No report selected yet. Upload one under **Laudos** and pick it here so I can cross-check it with the destination requirements.',
    semRegra: (cult, dest) => `There is no rule registered for **${cult} → ${dest}**. An administrator can add it under Administration › Rules.`,
    resumo: (ok, pend, risco, cult, dest) =>
      `For **${cult} → ${dest}**: **${ok}** requirement(s) met, **${pend}** pending and **${risco}** at risk.`,
    situacao: {
      ok: 'Everything is met: the report is ready for this destination.',
      pendente: 'There are pending items, but no blocking issue was detected.',
      risco: 'There are items at risk that block the shipment as it stands.',
    },
    pendencias: 'What to fix:',
    nadaPendente: 'Nothing pending — everything is met for this destination.',
    atendido: 'Already met:',
    nadaAtendido: 'No requirement met yet.',
    entidades: (pragas, doencas, talhoes) => `In the report I found — pests: **${pragas}**; diseases: **${doencas}**; plots: **${talhoes}**.`,
    negadas: (n) => ` Reported as absent: ${n}.`,
    nenhuma: 'none',
    documentos: 'Documents required for this destination:',
    semDocumentos: 'This rule requires no additional documents.',
    prazo: (dias, max) => `The latest inspection was **${dias}** day(s) before shipment; the maximum accepted is **${max}**.`,
    prazoOk: ' It is within the deadline.',
    prazoVencido: ' It is past the deadline: a new inspection is needed.',
    semEmbarque: 'Enter the planned shipment date so I can check the inspection deadline.',
    semInspecao: 'I could not find the inspection date in the report.',
    regra: (cult, dest, max) => `For **${cult} → ${dest}** the inspection must be at most **${max}** days old on the shipment date.`,
    regraBloqueios: (b) => ` Blocking pests/diseases: **${b}**.`,
    regraDocs: (d) => ` Required documents: ${d}.`,
    termo: {
      bloqueia: (t, cult, dest, onde) =>
        `**${t}** is restricted for ${cult} → ${dest} and **was detected** in the report${onde && ` (${onde})`}. It must be treated and proven before shipment.`,
      restritoAusente: (t, cult, dest) => `**${t}** is restricted for ${cult} → ${dest}, but **was not detected** in the report: requirement met.`,
      detectadoLivre: (t, cult, dest, onde) =>
        `**${t}** appears in the report${onde && ` (${onde})`}, but it is **not a restriction** registered for ${cult} → ${dest}.`,
      nada: (t, cult, dest) => `**${t}** does not appear in the report and is not a restriction registered for ${cult} → ${dest}.`,
      restritoSemLaudo: (t, cult, dest) => `**${t}** is restricted for ${cult} → ${dest}. Select a report so I can check whether it was detected.`,
      livreSemLaudo: (t, cult, dest) => `**${t}** is not a restriction registered for ${cult} → ${dest}.`,
    },
    saudacao: 'Hi! I am ExportBot. I cross-check your report with the destination country requirements. Try “what is pending?”.',
    ajuda: 'I can answer about **pending** items, **pests and diseases** in the report, **documents**, the inspection **deadline**, the **destination requirements** and what is already **met**. You can also mention another destination, crop or a pest in your question.',
    agradecimento: 'You are welcome! Just ask if you need anything else.',
    naoEntendi: 'I did not quite get that. Try: “what is pending?”, “which pests?”, “documents”, “deadline” or “what does China require?”.',
  },
};

export const T: Record<Lang, Textos> = { pt, en };
