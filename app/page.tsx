"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import CitationPanel, { GradingResult, Citation } from "@/components/CitationPanel";
import DocumentViewer from "@/components/DocumentViewer";
import { flattenDocumentsForUpload, ViewableDocument } from "@/lib/viewableDocument";

type StepStatus = "pending" | "active" | "done";

type PipelineStep = {
  label: string;
  status: StepStatus;
  startedAt: number | null;
  doneAt: number | null;
};

const STEP_LABELS = [
  "Converting PDF pages to images",
  "Uploading files to Gemini",
  "Analysing document",
  "Selecting rubric",
  "Grading submission",
  "Validating citations",
];

function elapsedMs(start: number | null, end: number | null): string | null {
  if (start === null) return null;
  const ms = (end ?? Date.now()) - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === "active") {
    return <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />;
  }
  return <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />;
}

export default function Home() {
  const [documents, setDocuments] = useState<ViewableDocument[]>([]);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force re-render every 100ms while grading so elapsed times tick live
  useEffect(() => {
    if (isGrading) {
      tickRef.current = setInterval(() => setSteps(s => [...s]), 100);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isGrading]);

  // Auto-switch tabs when hovering a citation
  useEffect(() => {
    if (hoveredCitation?.fileName) {
      const idx = documents.findIndex((document) => document.sourceFileName === hoveredCitation.fileName);
      if (idx !== -1 && idx !== activeDocumentIndex) {
        setActiveDocumentIndex(idx);
      }
    }
  }, [hoveredCitation, documents, activeDocumentIndex]);

  const initSteps = (): PipelineStep[] =>
    STEP_LABELS.map(label => ({ label, status: "pending", startedAt: null, doneAt: null }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setDocuments([]);
    setActiveDocumentIndex(0);
    setGradingResult(null);
    setError(null);
    setIsGrading(true);
    setSteps(initSteps());

    toast.success("Files Uploaded", {
      description: `${selectedFiles.length} file(s) selected for grading.`,
    });

    try {
      setSteps((prev) => prev.map((step, index) =>
        index === 0 ? { ...step, status: "active", startedAt: Date.now() } : step
      ));

      const { buildViewableDocuments } = await import("@/lib/buildViewableDocuments");
      const viewableDocuments = await buildViewableDocuments(selectedFiles);
      setDocuments(viewableDocuments);

      setSteps((prev) => prev.map((step, index) =>
        index === 0
          ? {
              ...step,
              label: viewableDocuments.some((document) => document.pages.length > 1)
                ? "Converted PDF pages to images"
                : "Prepared files for grading",
              status: "done",
              doneAt: Date.now(),
            }
          : step
      ));

      const uploadFiles = flattenDocumentsForUpload(viewableDocuments);
      const formData = new FormData();
      uploadFiles.forEach((file) => formData.append("file", file));

      const res = await fetch("/api/grade", { method: "POST", body: formData });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: any;
          try { event = JSON.parse(line); } catch { continue; }

          if (event.type === "step") {
            const label = event.label ?? STEP_LABELS[event.index] ?? "";
            setSteps(prev => prev.map((s, i) =>
              i === event.index + 1
                ? { ...s, label, status: "active", startedAt: Date.now() }
                : s
            ));
          } else if (event.type === "step_done") {
            const detail = event.detail ? ` (${event.detail})` : "";
            setSteps(prev => prev.map((s, i) =>
              i === event.index + 1
                ? { ...s, label: s.label.replace(/\.\.\.$/, "") + detail, status: "done", doneAt: Date.now() }
                : s
            ));
          } else if (event.type === "result") {
            setGradingResult(event.data);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
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

      {documents.length === 0 && !isGrading && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl bg-muted/5">
          <label className="flex flex-col items-center cursor-pointer p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
            </div>
            <span className="text-lg font-medium mb-2">Upload Homework Files</span>
            <span className="text-sm text-muted-foreground">Select one or more PDFs and Images</span>
            <input
              type="file"
              className="hidden"
              accept="application/pdf,image/*"
              multiple
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}

      {isGrading && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-sm">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-5">Pipeline Progress</p>
            <div className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <span className={`text-sm flex-1 transition-colors ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-right tabular-nums">
                    {step.status === "done" && elapsedMs(step.startedAt, step.doneAt)}
                    {step.status === "active" && <span className="text-accent">{elapsedMs(step.startedAt, null)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive rounded-lg text-destructive-foreground mb-4">
          <p className="font-semibold mb-1">Error grading homework</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => { setError(null); setDocuments([]); }}
            className="mt-3 text-sm underline cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {documents.length > 0 && gradingResult && (
        <div className="flex-1 flex flex-row gap-4 md:gap-8 items-start">
          {/* Left column: Viewer(s) */}
          <div className="flex-1 min-w-0 sticky top-8 h-[calc(100vh-4rem)] flex flex-col">
            {documents.length > 1 && (
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                {documents.map((document, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDocumentIndex(i)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md whitespace-nowrap transition-colors ${activeDocumentIndex === i ? 'bg-accent text-accent-foreground' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
                  >
                    {document.sourceFileName}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 min-h-0 bg-muted/10 border border-muted rounded-lg overflow-hidden flex flex-col">
              {documents[activeDocumentIndex] && (
                <DocumentViewer
                  document={documents[activeDocumentIndex]}
                  hoveredCitation={hoveredCitation}
                />
              )}
            </div>
          </div>

          {/* Right column: Results Panel */}
          <div className="w-[350px] md:w-1/3 shrink-0 flex flex-col">
            <div className="mb-4 pb-4 border-b border-muted flex justify-between items-center shrink-0">
              <h2 className="font-semibold">Grading Results</h2>
              <button
                onClick={() => { setDocuments([]); setGradingResult(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Start Over
              </button>
            </div>
            <CitationPanel
              result={gradingResult}
              hoveredCitation={hoveredCitation}
              onHoverCitation={setHoveredCitation}
            />
          </div>
        </div>
      )}
    </main>
  );
}
