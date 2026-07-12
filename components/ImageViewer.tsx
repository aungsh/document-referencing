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
  const containerRef = useRef<HTMLDivElement>(null);
  // Stores the actual rendered image rect within the element (accounting for object-contain)
  const [renderedRect, setRenderedRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Compute the actual rendered area of the image inside its element box
  const computeRenderedRect = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const elemW = img.clientWidth;
    const elemH = img.clientHeight;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    // object-contain: scale to fit while preserving aspect ratio
    const scale = Math.min(elemW / natW, elemH / natH);
    const renderedW = natW * scale;
    const renderedH = natH * scale;
    setRenderedRect({
      top: (elemH - renderedH) / 2,
      left: (elemW - renderedW) / 2,
      width: renderedW,
      height: renderedH,
    });
  };

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.addEventListener("load", computeRenderedRect);
    const ro = new ResizeObserver(computeRenderedRect);
    ro.observe(img);
    return () => {
      img.removeEventListener("load", computeRenderedRect);
      ro.disconnect();
    };
  }, [objectUrl]);

  const box = hoveredCitation?.fileName === file.name ? hoveredCitation.box_2d : null;

  // Position the highlight over the actual rendered image pixels, not the element bounding box
  const boxStyle = (box && renderedRect) ? {
    top:    `${renderedRect.top  + (box[0] / 1000) * renderedRect.height}px`,
    left:   `${renderedRect.left + (box[1] / 1000) * renderedRect.width}px`,
    height: `${((box[2] - box[0]) / 1000) * renderedRect.height}px`,
    width:  `${((box[3] - box[1]) / 1000) * renderedRect.width}px`,
  } : null;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-muted/10 overflow-hidden">
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
