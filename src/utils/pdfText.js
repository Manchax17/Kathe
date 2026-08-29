const MAX_CHARS = 90000;

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export async function extractPdfText(file, { onProgress } = {}) {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });

  try {
    const doc = await loadingTask.promise;

    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      pages.push(pageText);
      onProgress?.({ page: i, total: doc.numPages });
    }

    const fullText = pages
      .map((t) => t.trim())
      .filter(Boolean)
      .join('\n\n');

    if (!fullText) {
      throw new Error(
        'El PDF no tiene texto seleccionable. Probablemente es un escaneo; por ahora solo se admiten PDFs con texto.',
      );
    }

    const result = {
      truncated: fullText.length > MAX_CHARS,
      originalLength: fullText.length,
      numPages: doc.numPages,
      text: fullText.slice(0, MAX_CHARS),
    };
    return result;
  } finally {
    await loadingTask.destroy();
  }
}
