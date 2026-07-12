"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
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
  const [pagePixelSize, setPagePixelSize] = useState<{ width: number; height: number } | null>(null);

  // Read the actual canvas dimensions. react-pdf renders into a <canvas> element;
  // we measure it directly so our overlay uses real pixels, not error-prone percentages.
  const measureCanvas = useCallback(() => {
    const canvas = pageWrapperRef.current?.querySelector("canvas");
    if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      setPagePixelSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    }
  }, []);

  // useLayoutEffect fires synchronously after every DOM commit.
  // react-pdf may paint its canvas one animation frame later, so we also
  // schedule a rAF as a reliable fallback.
  useLayoutEffect(() => {
    measureCanvas();
    const raf = requestAnimationFrame(measureCanvas);
    return () => cancelAnimationFrame(raf);
  }, [currentPage, measureCanvas]);

  // ResizeObserver keeps the measurement correct when the window is resized.
  useEffect(() => {
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(measureCanvas);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [measureCanvas]);

  // Auto-navigate to the cited page when hovering a citation.
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

  if (!file) return null;

  // Show the highlight when the file matches and either no page is specified
  // (model omitted it) or the page matches the currently displayed page.
  const activeBox =
    hoveredCitation?.fileName === file.name &&
    (hoveredCitation.page == null || hoveredCitation.page === currentPage)
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
          {/* pageWrapperRef gives us a stable DOM node to measure the canvas inside */}
          <div ref={pageWrapperRef} className="relative inline-block shadow-lg">
            <Page
              pageNumber={currentPage}
              onRenderSuccess={measureCanvas}
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
