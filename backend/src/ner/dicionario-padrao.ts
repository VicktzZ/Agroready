import type { Dicionario } from './ner';

/** Dicionário inicial do NER (pragas, doenças e culturas). Fonte única: o seed grava no banco e a
 *  avaliação do NER (`npm run avaliar:ner`) usa o mesmo conteúdo. Depois do seed, quem manda é o banco. */
export const DICIONARIO_PADRAO: Dicionario = {
  PRAGA: [
    // soja
    'lagarta-da-soja', 'lagarta-falsa-medideira', 'lagarta-helicoverpa', 'percevejo-marrom', 'percevejo-verde',
    'percevejo-barriga-verde', 'mosca-branca', 'ácaro-vermelho', 'ácaro-rajado', 'nematoide-de-cisto',
    'nematoide-das-galhas', 'pulgão', 'tripes',
    // café
    'broca-do-café', 'bicho-mineiro', 'cochonilha-da-raiz',
    // milho, algodão, cana, arroz e citros
    'lagarta-do-cartucho', 'lagarta-elasmo', 'cigarrinha-do-milho', 'gorgulho', 'bicudo-do-algodoeiro',
    'broca-da-cana', 'cigarrinha-das-raízes', 'percevejo-do-colmo', 'mosca-das-frutas', 'psilídeo-dos-citros',
    'ácaro-da-leprose',
  ],
  DOENCA: [
    // soja
    'ferrugem-asiática', 'mancha-alvo', 'antracnose', 'mofo-branco', 'oídio', 'cancro-da-haste', 'podridão-radicular',
    'mancha-parda', 'murcha-de-fusarium',
    // café
    'ferrugem-do-cafeeiro', 'cercosporiose', 'mancha-de-phoma', 'mancha-aureolada',
    // trigo, arroz, milho, algodão, cana e citros
    'brusone', 'giberela', 'ferrugem-da-folha', 'mancha-branca', 'míldio', 'podridão-do-colmo', 'ramulose',
    'ferrugem-alaranjada', 'carvão', 'cancro-cítrico', 'greening', 'mancha-preta-dos-citros',
  ],
  CULTURA: ['soja', 'café', 'milho', 'algodão', 'trigo', 'arroz', 'laranja', 'cana-de-açúcar'],
};
