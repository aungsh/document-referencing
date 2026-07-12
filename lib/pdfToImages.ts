import { pdfjs } from "react-pdf";
import { pdfPageImageName } from "./pdfPageImageNames";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

export async function pdfToPageImages(file: File, scale = 2): Promise<File[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: File[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to create canvas context for PDF rendering");

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) reject(new Error(`Failed to convert PDF page ${pageNumber} to PNG`));
        else resolve(result);
      }, "image/png");
    });

    pages.push(
      new File([blob], pdfPageImageName(file.name, pageNumber), { type: "image/png" })
    );
  }

  return pages;
}
