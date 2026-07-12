"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export type Citation = {
  fileName: string;
  page?: number;
  box_2d?: [number, number, number, number];
  confidence: number;
  reasoning?: string;
};

export type CriteriaCard = {
  criterionName: string;
  feedback: string;
  citations: Citation[];
};

export type GradingResult = {
  subject: string;
  estimatedScore: string;
  overallSummary: string;
  criteriaCards: CriteriaCard[];
  teacherDiscussionQuestions: string[];
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

  return (
    <div className="flex-1 pr-4">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-muted">
        <div>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">
            Subject Detected
          </h2>
          <div className="font-semibold text-accent">{result.subject}</div>
        </div>
        <div className="text-right">
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">
            Est. Score
          </h2>
          <div className="font-semibold text-lg">{result.estimatedScore}</div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-4">
          Overall Summary
        </h2>
        <p className="text-sm text-foreground leading-relaxed">
          {result.overallSummary}
        </p>
      </div>

      <hr className="border-muted my-6" />

      {/* Criteria Cards */}
      <div className="mb-8">
        <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-4">
          Grading Criteria
        </h2>
        <div className="flex flex-col gap-6">
          {result.criteriaCards?.map((card, i) => (
            <div key={i} className="p-4 rounded-lg border border-muted bg-background">
              <h3 className="font-semibold text-foreground mb-2">{card.criterionName}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.feedback}</p>
              
              {/* Citations within this criterion */}
              {card.citations && card.citations.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-muted/50 pt-3">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Citations:</span>
                  {card.citations.map((c, j) => {
                    const isHovered = hoveredCitation === c;
                    return (
                      <div
                        key={j}
                        className={cn(
                          "text-xs p-2 rounded transition-colors cursor-pointer flex flex-col gap-1",
                          isHovered ? "bg-accent/10 border border-accent/30" : "bg-muted/10 border border-transparent hover:bg-muted/20"
                        )}
                        onMouseEnter={() => onHoverCitation(c)}
                        onMouseLeave={() => onHoverCitation(null)}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                          {c.fileName} {c.page ? `(Page ${c.page})` : ""}
                        </div>
                        {c.reasoning && (
                          <div className="text-foreground mt-1">"{c.reasoning}"</div>
                        )}
                        {c.box_2d && (
                          <div className="text-[10px] font-mono text-accent mt-1 opacity-80">
                            [Region Referenced]
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <hr className="border-muted my-6" />

      {/* Discussion Questions */}
      {result.teacherDiscussionQuestions && result.teacherDiscussionQuestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-4">
            Discussion Questions
          </h2>
          <ul className="flex flex-col gap-3">
            {result.teacherDiscussionQuestions.map((q, i) => (
              <li key={i} className="text-sm bg-accent/5 p-3 rounded border border-accent/10 text-foreground">
                <span className="font-semibold text-accent mr-2">Q:</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
