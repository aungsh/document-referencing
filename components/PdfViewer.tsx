"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Citation } from "./CitationPanel";
import HighlightOverlay from "./HighlightOverlay";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

export default function PdfViewer({
  file,
  hoveredCitation,
}: {
  file: File | null;
  hoveredCitation: Citation | null;
}) {
  const [numPages, setNumPages] = useState<number>();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  // Actual rendered pixel size of the PDF canvas (updated by ResizeObserver)
  const [pagePixelSize, setPagePixelSize] = useState<{ width: number; height: number } | null>(null);

  // Observe the page wrapper for size changes (zoom, window resize, etc.)
  useEffect(() => {
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // The canvas inside the wrapper is the true rendered size.
        const canvas = wrapper.querySelector("canvas");
        if (canvas) {
          setPagePixelSize({ width: canvas.clientWidth, height: canvas.clientHeight });
        }
      }
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [currentPage]); // re-observe when page changes since react-pdf remounts the canvas

  useEffect(() => {
    if (hoveredCitation?.page && hoveredCitation.page <= (numPages || 1)) {
      setCurrentPage(hoveredCitation.page);
    }
  }, [hoveredCitation, numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPagePixelSize(null);
  };

  const onPageRenderSuccess = useCallback(() => {
    const canvas = pageWrapperRef.current?.querySelector("canvas");
    if (canvas) {
      setPagePixelSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    }
  }, []);

  if (!file) return null;

  const activeBox =
    hoveredCitation?.page === currentPage && hoveredCitation?.fileName === file.name
      ? hoveredCitation.box_2d
      : null;

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
          {/* pageWrapperRef wraps the canvas so we can measure it precisely */}
          <div ref={pageWrapperRef} className="relative inline-block shadow-lg">
            <Page
              pageNumber={currentPage}
              onRenderSuccess={onPageRenderSuccess}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="rounded overflow-hidden"
              width={containerRef.current ? Math.min(containerRef.current.clientWidth - 32, 800) : 800}
            />
            <HighlightOverlay box={activeBox} pagePixelSize={pagePixelSize} />
          </div>
        </Document>
      </div>
    </div>
  );
}
