import type { ViewableDocument } from "./viewableDocument";
import { pdfToPageImages } from "./pdfToImages";

export async function buildViewableDocuments(files: File[]): Promise<ViewableDocument[]> {
  const documents: ViewableDocument[] = [];

  for (const file of files) {
    if (file.type === "application/pdf") {
      const pages = await pdfToPageImages(file);
      documents.push({ sourceFileName: file.name, pages });
      continue;
    }

    documents.push({ sourceFileName: file.name, pages: [file] });
  }

  return documents;
}
