export type ViewableDocument = {
  sourceFileName: string;
  pages: File[];
};

export function flattenDocumentsForUpload(documents: ViewableDocument[]): File[] {
  return documents.flatMap((document) => document.pages);
}
