import { UnprocessableEntityException, UnsupportedMediaTypeException } from '@nestjs/common';

/* pdfjs (dentro do pdf-parse) exige DOMMatrix, que vem do binário nativo @napi-rs/canvas.
   - `pdf-parse/worker` primeiro: faz require estático do canvas, então o bundler da Vercel o inclui.
   - Carregado sob demanda: se ainda assim faltar, só o envio de PDF falha, não a API inteira. */
async function carregarPdfParse() {
  require('pdf-parse/worker');
  return (await import('pdf-parse')).PDFParse;
}

export interface ArquivoEnviado {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** O multer entrega o nome do arquivo em latin1; nomes com acento chegam truncados sem isto. */
export const nomeDoArquivo = (a: ArquivoEnviado) => Buffer.from(a.originalname, 'latin1').toString('utf8');

/** Extrai o texto de um laudo enviado como .txt ou PDF com texto selecionável.
 *  ponytail: sem OCR — PDF escaneado e imagem são recusados com mensagem clara;
 *  acrescentar tesseract se laudos escaneados forem comuns. */
export async function extrairTexto(arquivo: ArquivoEnviado): Promise<{ texto: string; origem: 'pdf' | 'txt' }> {
  const { buffer } = arquivo;

  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
    let PDFParse: Awaited<ReturnType<typeof carregarPdfParse>>;
    try {
      PDFParse = await carregarPdfParse();
    } catch {
      throw new UnprocessableEntityException('Leitura de PDF indisponível no servidor. Cole o texto do laudo ou envie um .txt.');
    }
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    let texto: string;
    try {
      texto = (await parser.getText()).text;
    } catch {
      throw new UnprocessableEntityException('Não foi possível ler o PDF (arquivo corrompido ou protegido por senha).');
    } finally {
      await parser.destroy().catch(() => undefined);
    }
    texto = texto.replace(/^\s*-- \d+ of \d+ --\s*$/gm, '').trim(); // separador de páginas do pdf-parse
    if (!texto) {
      throw new UnprocessableEntityException(
        'Este PDF não tem texto selecionável (parece escaneado). Cole o texto do laudo ou envie um PDF digital.',
      );
    }
    return { texto, origem: 'pdf' };
  }

  const pareceTexto = /\.txt$/i.test(arquivo.originalname) || arquivo.mimetype.startsWith('text/');
  if (!pareceTexto || buffer.includes(0)) {
    throw new UnsupportedMediaTypeException('Formato não suportado. Envie um arquivo .txt ou um PDF com texto.');
  }
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    texto = new TextDecoder('windows-1252').decode(buffer); // .txt salvo pelo Bloco de Notas antigo
  }
  texto = texto.trim();
  if (!texto) throw new UnprocessableEntityException('O arquivo está vazio.');
  return { texto, origem: 'txt' };
}
