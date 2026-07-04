"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import CitationPanel, { GradingResult, Citation } from "@/components/CitationPanel";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-lg border border-muted"><div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div></div>
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setGradingResult(null);
    setError(null);
    setIsGrading(true);

    toast.success("PDF Uploaded", {
      description: `File: ${selected.name} (${(selected.size / 1024 / 1024).toFixed(2)} MB)`,
    });

    try {
      const formData = new FormData();
      formData.append("file", selected);

      const res = await fetch("/api/grade", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to grade homework");
      }

      const json = await res.json();
      setGradingResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col px-6 md:px-12 py-8 max-w-[1400px] mx-auto w-full">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Homework Grader</h1>
          <p className="text-sm text-muted-foreground font-mono">AI-Graded Homework with Source-Linked Citations</p>
        </div>
        <Link 
          href="/how-it-works"
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          How it Works
        </Link>
      </header>

      {!file && !isGrading && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl bg-muted/5">
          <label className="flex flex-col items-center cursor-pointer p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
            </div>
            <span className="text-lg font-medium mb-2">Upload Homework PDF</span>
            <span className="text-sm text-muted-foreground">Only PDF files are supported</span>
            <input 
              type="file" 
              className="hidden" 
              accept="application/pdf"
              onChange={handleFileUpload} 
            />
          </label>
        </div>
      )}

      {isGrading && (
        <div className="flex-1 flex flex-col items-center justify-center border border-muted rounded-xl bg-muted/5">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mb-4"></div>
          <p className="text-foreground font-medium animate-pulse">Grading submission with Gemini...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive rounded-lg text-destructive-foreground mb-4">
          <p className="font-semibold mb-1">Error grading homework</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => { setError(null); setFile(null); }}
            className="mt-3 text-sm underline cursor-pointer"
          >
            Try another file
          </button>
        </div>
      )}

      {file && gradingResult && (
        <div className="flex-1 flex flex-row gap-4 md:gap-8 items-start">
          {/* Left column: PDF Viewer */}
          <div className="flex-1 min-w-0 sticky top-8 h-[calc(100vh-4rem)]">
            <PdfViewer file={file} hoveredCitation={hoveredCitation} />
          </div>

          {/* Right column: Results Panel */}
          <div className="w-[350px] md:w-1/3 shrink-0 flex flex-col">
            <div className="mb-4 pb-4 border-b border-muted flex justify-between items-center shrink-0">
              <h2 className="font-semibold">Grading Results</h2>
              <button 
                onClick={() => { setFile(null); setGradingResult(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Start Over
              </button>
            </div>
            <CitationPanel 
              result={gradingResult} 
              hoveredCitation={hoveredCitation}
              onHoverCitation={setHoveredCitation}
              fileName={file.name}
            />
          </div>
        </div>
      )}
    </main>
  );
}
