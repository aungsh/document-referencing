"use client";

export default function HighlightOverlay({
  box,
}: {
  box: [number, number, number, number] | null | undefined;
}) {
  if (!box) return null;

  return (
    <div
      className="absolute bg-accent/25 border-2 border-accent rounded-[2px] pointer-events-none transition-all duration-300"
      style={{
        top: `${box[0] / 10}%`,
        left: `${box[1] / 10}%`,
        height: `${(box[2] - box[0]) / 10}%`,
        width: `${(box[3] - box[1]) / 10}%`,
        boxShadow: "0 0 0 2px oklch(0.87 0.22 130 / 0.4), 0 0 20px oklch(0.87 0.22 130 / 0.3)",
      }}
    />
  );
}
