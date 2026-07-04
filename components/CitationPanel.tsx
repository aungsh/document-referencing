"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type Citation = {
  point: string;
  fileName?: string;
  page?: number;
  quote?: string;
  box_2d?: [number, number, number, number];
};

export type GradingResult = {
  overallSummary: string;
  strengths: Citation[];
  weaknesses: Citation[];
  talkingPoints: Citation[];
};

export default function CitationPanel({
  result,
  hoveredCitation,
  onHoverCitation,
}: {
  result: GradingResult | null;
  hoveredCitation: Citation | null;
  onHoverCitation: (citation: Citation | null) => void;
}) {
  if (!result) return null;

  const renderSection = (title: string, citations: Citation[]) => {
    if (!citations || citations.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-4">
          {title}
        </h2>
        <div className="flex flex-col gap-3">
          {citations.map((c, i) => {
            const isHovered = hoveredCitation === c;
            return (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-lg border transition-colors cursor-pointer",
                  isHovered ? "border-accent bg-accent/10" : "border-muted bg-background hover:bg-muted/30"
                )}
                onMouseEnter={() => onHoverCitation(c)}
                onMouseLeave={() => onHoverCitation(null)}
              >
                <div className="font-medium text-sm mb-2 text-foreground">{c.point}</div>
                {(c.quote || c.box_2d) && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="text-xs text-muted-foreground font-mono bg-muted/20 p-2 rounded border-l-2 border-muted">
                      {c.box_2d ? "[Image Region Referenced]" : `"${c.quote}"`}
                    </div>
                    
                    {/* Filename hover pill */}
                    <div className={cn(
                      "flex items-center gap-1.5 self-start text-[10px] font-mono px-2 py-1 rounded bg-muted/40 text-muted-foreground transition-opacity",
                      isHovered ? "opacity-100" : "opacity-0"
                    )}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {c.fileName} {c.page ? `(Page ${c.page})` : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 pr-4">
      <div className="mb-8">
        <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-4">
          Overall Summary
        </h2>
        <p className="text-sm text-foreground leading-relaxed">
          {result.overallSummary}
        </p>
      </div>

      <hr className="border-muted my-6" />

      {renderSection("Strengths", result.strengths)}
      {renderSection("Weaknesses", result.weaknesses)}
      {renderSection("Talking Points", result.talkingPoints)}
    </div>
  );
}
