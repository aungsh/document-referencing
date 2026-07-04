import Fuse from "fuse.js";
import { TextItem } from "pdfjs-dist/types/src/display/api";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function matchQuote(
  quote: string,
  textItems: any[]
): BoundingBox[] | null {
  if (!quote || quote.trim() === "") return null;
  if (!textItems || textItems.length === 0) return null;

  let combinedText = "";
  const charIndexToItemIndex: number[] = [];

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    // Skip invalid items or TextMarkedContent which lack `str` or `transform`
    if (!item || typeof item.str !== "string") {
      continue;
    }
    const text = item.str;
    for (let j = 0; j < text.length; j++) {
      combinedText += text[j];
      charIndexToItemIndex.push(i);
    }
  }

  if (combinedText.length === 0) return null;

  const windowSize = Math.max(quote.length + 50, 100);
  const windows: { id: number; text: string; startIndex: number }[] = [];
  
  for (let i = 0; i < combinedText.length; i += windowSize / 2) {
    windows.push({
      id: i,
      text: combinedText.substring(i, i + windowSize),
      startIndex: i,
    });
  }

  const fuse = new Fuse(windows, {
    keys: ["text"],
    includeMatches: true,
    includeScore: true,
    threshold: 0.4,
  });

  const results = fuse.search(quote);
  if (results.length === 0) return null;

  const bestResult = results[0];
  if (!bestResult.matches || bestResult.matches.length === 0) return null;

  const match = bestResult.matches[0];
  const indices = match.indices; 
  if (indices.length === 0) return null;

  let longestMatch = indices[0];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i][1] - indices[i][0] > longestMatch[1] - longestMatch[0]) {
      longestMatch = indices[i];
    }
  }

  const globalStart = bestResult.item.startIndex + longestMatch[0];
  const globalEnd = bestResult.item.startIndex + longestMatch[1];

  const matchedItems = new Set<any>();
  for (let i = globalStart; i <= globalEnd; i++) {
    if (i >= 0 && i < charIndexToItemIndex.length) {
      const itemIndex = charIndexToItemIndex[i];
      if (itemIndex !== undefined && textItems[itemIndex]) {
        matchedItems.add(textItems[itemIndex]);
      }
    }
  }

  if (matchedItems.size === 0) return null;

  const boxes: BoundingBox[] = [];
  matchedItems.forEach((item) => {
    // Robust check for transform array
    if (!item || !Array.isArray(item.transform) || item.transform.length < 6) return;

    const transform = item.transform;
    const x = transform[4];
    const y = transform[5]; 
    const width = item.width || 0;
    const height = item.height || 0;
    
    boxes.push({ x, y, width, height });
  });

  return boxes;
}
