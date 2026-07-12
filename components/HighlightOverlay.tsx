"use client";

export default function HighlightOverlay({
  box,
  pagePixelSize,
}: {
  box: [number, number, number, number] | null | undefined;
  // When provided, pixel-exact positioning is used (for PDFs where the canvas
  // has a measured size). When null, the overlay is hidden until measurement is ready.
  pagePixelSize?: { width: number; height: number } | null;
}) {
  if (!box) return null;

  // PDF path: use real pixel positions computed from the measured canvas size.
  if (pagePixelSize) {
    const { width: W, height: H } = pagePixelSize;
    return (
      <div
        className="absolute z-10 bg-accent/25 border-2 border-accent rounded-[2px] pointer-events-none transition-all duration-300"
        style={{
          top:    `${(box[0] / 1000) * H}px`,
          left:   `${(box[1] / 1000) * W}px`,
          height: `${((box[2] - box[0]) / 1000) * H}px`,
          width:  `${((box[3] - box[1]) / 1000) * W}px`,
          boxShadow: "0 0 0 2px oklch(0.87 0.22 130 / 0.4), 0 0 20px oklch(0.87 0.22 130 / 0.3)",
        }}
      />
    );
  }

  // Fallback percentage path (not used for PDFs with the new approach, kept for safety).
  return (
    <div
      className="absolute z-10 bg-accent/25 border-2 border-accent rounded-[2px] pointer-events-none transition-all duration-300"
      style={{
        top:    `${box[0] / 10}%`,
        left:   `${box[1] / 10}%`,
        height: `${(box[2] - box[0]) / 10}%`,
        width:  `${(box[3] - box[1]) / 10}%`,
        boxShadow: "0 0 0 2px oklch(0.87 0.22 130 / 0.4), 0 0 20px oklch(0.87 0.22 130 / 0.3)",
      }}
    />
  );
}
