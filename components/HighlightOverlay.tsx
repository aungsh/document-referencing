"use client";

export default function HighlightOverlay({
  box,
  pagePixelSize,
}: {
  box: [number, number, number, number] | null | undefined;
  pagePixelSize: { width: number; height: number } | null;
}) {
  if (!box || !pagePixelSize) return null;

  const { width: W, height: H } = pagePixelSize;

  const style = {
    top:    `${(box[0] / 1000) * H}px`,
    left:   `${(box[1] / 1000) * W}px`,
    height: `${((box[2] - box[0]) / 1000) * H}px`,
    width:  `${((box[3] - box[1]) / 1000) * W}px`,
  };

  return (
    <div
      className="absolute bg-accent/25 border-2 border-accent rounded-[2px] pointer-events-none transition-all duration-300"
      style={{
        ...style,
        boxShadow: "0 0 0 2px oklch(0.87 0.22 130 / 0.4), 0 0 20px oklch(0.87 0.22 130 / 0.3)",
      }}
    />
  );
}
