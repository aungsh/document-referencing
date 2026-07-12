"use client";

import { useEffect, useState } from "react";
import { Citation } from "./CitationPanel";
import ImageViewer from "./ImageViewer";
import { ViewableDocument } from "@/lib/viewableDocument";

export default function DocumentViewer({
  document,
  hoveredCitation,
}: {
  document: ViewableDocument;
  hoveredCitation: Citation | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = document.pages.length;
  const activePageFile = document.pages[currentPage - 1];

  useEffect(() => {
    if (hoveredCitation?.fileName === document.sourceFileName && hoveredCitation.page) {
      const page = Math.min(Math.max(hoveredCitation.page, 1), pageCount);
      setCurrentPage(page);
    }
  }, [hoveredCitation, document.sourceFileName, pageCount]);

  if (!activePageFile) return null;

  return (
    <div className="flex flex-col h-full bg-muted/10 rounded-lg border border-muted overflow-hidden relative">
      {pageCount > 1 && (
        <div className="bg-muted/30 p-2 border-b border-muted flex items-center justify-between text-sm">
          <div className="text-muted-foreground font-mono">
            Page {currentPage} of {pageCount}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 bg-background border border-muted rounded disabled:opacity-50 hover:bg-muted/50 cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              disabled={currentPage >= pageCount}
              className="px-2 py-1 bg-background border border-muted rounded disabled:opacity-50 hover:bg-muted/50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ImageViewer
          file={activePageFile}
          hoveredCitation={hoveredCitation}
          citationSourceName={document.sourceFileName}
          pageNumber={pageCount > 1 ? currentPage : undefined}
        />
      </div>
    </div>
  );
}
