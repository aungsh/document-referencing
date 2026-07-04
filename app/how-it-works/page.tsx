"use client";

import Link from "next/link";

export default function HowItWorks() {
  return (
    <main className="flex-1 px-6 md:px-12 py-12 max-w-3xl mx-auto w-full">
      <div className="mb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 font-mono"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to Demo
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
          How it Works
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Using the Gemini API to extract structured, source-linked citations from PDFs and images.
        </p>
      </div>

      <div className="space-y-16">

        {/* 01 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            01. The Architecture
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Files are uploaded to the <strong>Gemini File API</strong>, then passed to <code>gemini-2.5-flash</code> with a strict JSON schema. The model must return a structured grading response where every point references its source material — either a text quote (PDF) or a bounding box (image).
            </p>
            <p>
              On the frontend, hovering a citation triggers a highlight: a text overlay for PDFs (via <code>pdf.js</code> + fuzzy match), or a CSS bounding box drawn directly over the image.
            </p>
          </div>
        </section>

        {/* 02 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            02. Referencing PDFs
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              For PDFs, the model returns a <code>quote</code> (verbatim text) and <code>page</code> number. The frontend extracts the PDF text layer via <code>pdf.js</code> and runs a fuzzy search to find the matching text node and its coordinates.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre><code>{`// Schema
const citationSchema = {
  type: Type.OBJECT,
  properties: {
    point:    { type: Type.STRING },
    fileName: { type: Type.STRING },
    page:     { type: Type.INTEGER },
    quote:    { type: Type.STRING },  // verbatim text from the PDF
    box_2d:   { type: Type.ARRAY, items: { type: Type.INTEGER } },
  },
};

// Prompt instruction for PDFs
"If referencing a PDF: include the 'page' number and an exact
verbatim 'quote'. Short quotes match more reliably."`}</code></pre>
          </div>
        </section>

        {/* 03 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            03. Referencing Images
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Gemini 2.5 Flash has native <strong>Spatial Understanding</strong>. For images, the model skips text and returns a <code>box_2d</code> array: <code>[ymin, xmin, ymax, xmax]</code> scaled 0 to 1000. The frontend converts these to CSS percentages and draws a highlight box directly on the image — no OCR needed.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre><code>{`// Prompt instruction for images
"If referencing an image: DO NOT use 'quote'. Instead return
'box_2d': [ymin, xmin, ymax, xmax] scaled 0–1000."

// Frontend: convert box_2d to CSS and overlay on the <img>
const box = hoveredCitation?.box_2d;
const boxStyle = box ? {
  top:    \`\${box[0] / 10}%\`,
  left:   \`\${box[1] / 10}%\`,
  height: \`\${(box[2] - box[0]) / 10}%\`,
  width:  \`\${(box[3] - box[1]) / 10}%\`,
} : null;

// Rendered as an absolutely-positioned div over the image
<div className="absolute border-2 border-accent" style={boxStyle} />`}</code></pre>
          </div>
        </section>

        {/* 04 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            04. User Reassurance &amp; Uploads
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              To reassure users, you can show a popup confirming their document was successfully received, then display the raw content on screen. <strong>This is entirely independent of the Gemini API</strong>.
            </p>
            <p>
              Showing an upload confirmation is standard frontend UI, triggered when a file successfully uploads to your database or cloud storage (like S3). Similarly, rendering the raw document alongside AI feedback is achieved by passing the file URL to your frontend viewer.
            </p>
          </div>
        </section>

      </div>

      <div className="mt-20 pt-8 border-t border-muted">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
        >
          Try the Demo
        </Link>
      </div>
    </main>
  );
}

