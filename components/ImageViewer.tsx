"use client";

import { useEffect, useState } from "react";
import { Citation } from "./CitationPanel";

export default function ImageViewer({ 
  file, 
  hoveredCitation 
}: { 
  file: File; 
  hoveredCitation: Citation | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isRelevantCitation = hoveredCitation && hoveredCitation.fileName === file.name && hoveredCitation.box_2d;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted/10 border border-muted rounded-lg overflow-hidden">
      {objectUrl && (
        <div className="relative inline-block max-w-full max-h-full">
          <img 
            src={objectUrl} 
            alt={file.name} 
            className="max-w-full max-h-[calc(100vh-4rem)] object-contain block"
          />
          {isRelevantCitation && (
            <div 
              className="absolute border-2 border-accent bg-accent/20 pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(var(--color-accent),0.5)]"
              style={{
                top: `${hoveredCitation.box_2d![0] / 10}%`,
                left: `${hoveredCitation.box_2d![1] / 10}%`,
                height: `${(hoveredCitation.box_2d![2] - hoveredCitation.box_2d![0]) / 10}%`,
                width: `${(hoveredCitation.box_2d![3] - hoveredCitation.box_2d![1]) / 10}%`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
