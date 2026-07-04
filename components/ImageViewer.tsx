"use client";

import { useEffect, useRef, useState } from "react";
import { Citation } from "./CitationPanel";

export default function ImageViewer({ 
  file, 
  hoveredCitation 
}: { 
  file: File; 
  hoveredCitation: Citation | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const box = hoveredCitation?.fileName === file.name ? hoveredCitation.box_2d : null;

  // box_2d is [ymin, xmin, ymax, xmax] scaled 0–1000
  // Percentages are relative to the img element itself
  const boxStyle = box ? {
    top:    `${box[0] / 10}%`,
    left:   `${box[1] / 10}%`,
    height: `${(box[2] - box[0]) / 10}%`,
    width:  `${(box[3] - box[1]) / 10}%`,
  } : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted/10 overflow-hidden">
      {objectUrl && (
        <div className="relative">
          <img
            ref={imgRef}
            src={objectUrl}
            alt={file.name}
            className="max-w-full max-h-[calc(100vh-8rem)] object-contain block"
          />
          {boxStyle && (
            <div
              className="absolute border-2 border-accent bg-accent/25 pointer-events-none"
              style={{
                ...boxStyle,
                boxShadow: "0 0 0 2px oklch(0.87 0.22 130 / 0.4), 0 0 20px oklch(0.87 0.22 130 / 0.3)",
                transition: "all 0.2s ease",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

