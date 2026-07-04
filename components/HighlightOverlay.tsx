"use client";

import { BoundingBox } from "@/lib/matchQuote";

export default function HighlightOverlay({
  boxes,
}: {
  boxes: BoundingBox[];
}) {
  if (!boxes || boxes.length === 0) return null;

  return (
    <>
      {boxes.map((box, i) => {
        // react-pdf text layer coordinates:
        // By default, the text layer in react-pdf is positioned over the canvas.
        // We will place this overlay inside the same container.
        // pdf.js text items have transform [scaleX, skewY, skewX, scaleY, tx, ty]
        // But react-pdf's Page renders them using CSS.
        // We might need to adjust y because pdf.js y is from bottom, but react-pdf text layer normalizes it to top if we use text layer.
        // Wait, if we use the raw item.transform, ty is from bottom.
        // Actually, react-pdf text items provide coordinates relative to the unscaled page.
        // Let's render absolute divs. The parent should have relative positioning and scale.
        // For simplicity, we assume boxes are from item.transform where y is bottom up.
        // Wait, text item height from pdf.js is unscaled. We need to flip y based on page height.
        // Let's just pass raw boxes for now and rely on a parent container for scaling.
        // A better approach for the PoC is to just use a mix-blend-mode or simple background over the item.
        return (
          <div
            key={i}
            className="absolute bg-accent/30 border border-accent rounded-[2px] pointer-events-none transition-all duration-300"
            style={{
              left: `${box.x}px`,
              // This is a naive positioning, we'll refine in PdfViewer
              bottom: `${box.y}px`, 
              width: `${box.width}px`,
              height: `${box.height}px`,
              // if bottom-up is wrong, we might need top: ...
            }}
          />
        );
      })}
    </>
  );
}
