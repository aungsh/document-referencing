const PAGE_IMAGE_SUFFIX = "::page-";

export function isPdfPageImageName(name: string): boolean {
  return name.includes(PAGE_IMAGE_SUFFIX) && name.endsWith(".png");
}

export function parsePdfPageImageName(name: string): { sourceName: string; page: number } | null {
  const match = name.match(/^(.+)::page-(\d+)\.png$/);
  if (!match) return null;
  return { sourceName: match[1], page: Number.parseInt(match[2], 10) };
}

export function pdfPageImageName(sourceName: string, page: number): string {
  return `${sourceName}${PAGE_IMAGE_SUFFIX}${page}.png`;
}

export function normalizeCitationFileName(fileName: string): { fileName: string; page?: number } {
  const parsed = parsePdfPageImageName(fileName);
  if (!parsed) return { fileName };
  return { fileName: parsed.sourceName, page: parsed.page };
}
