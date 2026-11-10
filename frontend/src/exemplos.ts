/* Laudos fictícios para quem está conhecendo o sistema. Cada um mostra um
   comportamento diferente do NER e dos bots (ver `tags`). */

export interface LaudoExemplo {
  id: string;
  titulo: string;
  descricao: string;
  tags: string[];
  texto: string;
}

export const LAUDOS_EXEMPLO: LaudoExemplo[] = [
  {
    id: 'soja-cafe',
    titulo: 'Soja e café com achados',
    descricao: 'Dois talhões, duas culturas. Cada destino bloqueia uma praga diferente.',
    tags: ['2 culturas', 'por talhão', 'negação'],
    texto: `LAUDO FITOSSANITÁRIO Nº 2026/0842
Propriedade: Fazenda Santa Clara — Município de Cristalina/GO

Talhão 03 (soja, 42 ha): inspeção realizada em 12/08/2026 pelo engenheiro agrônomo responsável. Foi constatada ferrugem-asiática em nível baixo e presença de percevejos-marrons abaixo do nível de ação. Não foi constatada mosca-branca. Aplicação de fungicida em 20/08/2026.

Talhão 07 (café, 18 ha): inspeção realizada em 14/08/2026. Detectada broca-do-café em 2% dos frutos amostrados e sinais de cercosporiose. Manejo com controle biológico iniciado em 25/08/2026.

Conclusão: lavouras em condição fitossanitária controlada, com monitoramento semanal.`,
  },
  {
    id: 'soja-limpa',
    titulo: 'Soja sem restrições',
    descricao: 'Pragas citadas só como ausentes: nenhuma vira bloqueio. Bom para ver tudo atendido.',
    tags: ['tudo ausente', 'data por extenso'],
    texto: `LAUDO FITOSSANITÁRIO Nº 2026/1107
Propriedade: Fazenda Boa Esperança — Município de Sorriso/MT

Talhão 01 (soja, 180 ha): inspeção realizada em 3 de novembro de 2026. Lavoura em estádio R5. Ausência de ferrugem-asiática, mancha-alvo e mofo-branco. Não foram encontrados percevejo-marrom nem mosca-branca nas amostragens de pano de batida.

Talhão 02 (soja, 95 ha): inspeção realizada em 04/11/2026. Não foi constatada lagarta-da-soja. Presença de lagarta-falsa-medideira abaixo do nível de controle.

Conclusão: área apta, sem pragas quarentenárias detectadas.`,
  },
  {
    id: 'cafe-pendencias',
    titulo: 'Café com pendências',
    descricao: 'Três talhões de café com broca, bicho-mineiro e ferrugem. Trava em qualquer destino.',
    tags: ['3 talhões', 'vistoria', 'em risco'],
    texto: `LAUDO FITOSSANITÁRIO Nº 2026/0655
Propriedade: Sítio Três Barras — Município de Varginha/MG

Talhão 11 (café, 12,5 ha): vistoria realizada em 22/09/2026. Constatado bicho-mineiro em 18% das folhas amostradas e focos de ferrugem-do-cafeeiro no terço inferior. Recomendada aplicação de fungicida sistêmico.

Talhão 12 (café, 9 ha): vistoria realizada em 23/09/2026. Detectada broca-do-café em 4% dos frutos e sintomas iniciais de mancha-de-phoma. Sem sinais de cercosporiose.

Talhão 15 (café, 6 ha): vistoria realizada em 23/09/2026. Lavoura recém-podada, em bom estado.

Conclusão: necessário manejo antes da colheita; nova vistoria em 15 dias.`,
  },
  {
    id: 'digitado-as-pressas',
    titulo: 'Laudo digitado às pressas',
    descricao: 'Sem acento, sem hífen, com erro de digitação e sem número. O NER ainda entende.',
    tags: ['erros de digitação', 'plural', 'sem nº'],
    texto: `Laudo de inspecao de campo
Fazenda Sao Jorge, municipio de Rio Verde/GO

talhao 4 - soja - 60 hectares. inspecao feita em 28/10/2026. encontrada ferugem asiatica nas folhas de baixo e muitos percevejos marrons. tambem tem mofo branco em reboleira.

talhao 5 - soja - 35 hectares. inspecao feita em 28/10/2026. sem mosca branca e sem lagarta da soja.`,
  },
];
