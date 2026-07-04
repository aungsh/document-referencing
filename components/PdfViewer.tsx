"use client";

import { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Citation } from "./CitationPanel";
import { matchQuote, BoundingBox } from "@/lib/matchQuote";
import HighlightOverlay from "./HighlightOverlay";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs"; // Adjust extension if we used .mjs or .js

type TextContentCache = {
  [pageIndex: number]: any[];
};

export default function PdfViewer({
  file,
  hoveredCitation,
}: {
  file: File | null;
  hoveredCitation: Citation | null;
}) {
  const [numPages, setNumPages] = useState<number>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [textCache, setTextCache] = useState<TextContentCache>({});
  const [highlights, setHighlights] = useState<BoundingBox[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine target page from hovered citation
    if (hoveredCitation && hoveredCitation.page) {
      if (hoveredCitation.page <= (numPages || 1)) {
        setCurrentPage(hoveredCitation.page);
      }
    } else {
      setHighlights([]);
    }
  }, [hoveredCitation, numPages]);

  useEffect(() => {
    // When page or hover changes, compute highlights
    if (hoveredCitation && hoveredCitation.quote && hoveredCitation.page === currentPage) {
      const items = textCache[currentPage];
      if (items) {
        const boxes = matchQuote(hoveredCitation.quote, items);
        if (boxes) {
          setHighlights(boxes);
        } else {
          setHighlights([]);
        }
      }
    } else {
      setHighlights([]);
    }
  }, [currentPage, hoveredCitation, textCache]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setTextCache({});
    setHighlights([]);
  };

  const onPageLoadSuccess = async (page: any) => {
    try {
      const textContent = await page.getTextContent();
      setTextCache((prev) => ({
        ...prev,
        [page.pageNumber]: textContent.items,
      }));
    } catch (e) {
      console.error("Failed to extract text content", e);
    }
  };

  if (!file) return null;

  return (
    <div className="flex flex-col h-full bg-muted/10 rounded-lg border border-muted overflow-hidden relative">
      {/* Controls */}
      <div className="bg-muted/30 p-2 border-b border-muted flex items-center justify-between text-sm">
        <div className="text-muted-foreground font-mono">
          Page {currentPage} of {numPages || "?"}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 bg-background border border-muted rounded disabled:opacity-50 hover:bg-muted/50 cursor-pointer"
          >
            Prev
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages || 1, p + 1))}
            disabled={currentPage >= (numPages || 1)}
            className="px-2 py-1 bg-background border border-muted rounded disabled:opacity-50 hover:bg-muted/50 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto p-4 flex justify-center bg-black/40" ref={containerRef}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex justify-center"
          loading={<div className="text-muted-foreground font-mono mt-10">Loading PDF...</div>}
        >
          <div className="relative inline-block shadow-lg">
            <Page
              pageNumber={currentPage}
              onLoadSuccess={onPageLoadSuccess}
              renderAnnotationLayer={false}
              renderTextLayer={true}
              className="rounded overflow-hidden"
              width={containerRef.current ? Math.min(containerRef.current.clientWidth - 32, 800) : 800}
            />
            {/* The HighlightOverlay needs to be positioned over the page */}
            <HighlightOverlay boxes={highlights} />
          </div>
        </Document>
      </div>
    </div>
  );
}
