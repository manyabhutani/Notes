import * as pdfjs from 'pdfjs-dist';

// pdfjs-dist requires a worker to process PDFs in a separate thread
// we use the one from the same package
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const processPdf = async (file: File, notebookId: number, lastOrder: number) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    pages.push({
      notebookId,
      order: lastOrder + i,
      type: 'pdf' as const,
      pdfBlob: new Blob([arrayBuffer], { type: 'application/pdf' }),
      pdfPageNumber: i,
    });
  }
  return pages;
};
