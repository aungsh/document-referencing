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
          The technical architecture behind AI-graded homework and source-linked citations.
        </p>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            01. The Architecture (PDFs)
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              This demo uses the <strong>Gemini 2.5 Flash API</strong>.
            </p>
            <p>
              When a PDF is uploaded, it is sent to the Gemini File API. We prompt the model with a strict JSON schema, instructing it to provide feedback and strictly include an <strong>exact, verbatim quote</strong> from the document for every point it makes.
            </p>
            <p>
              On the frontend, we use <code>pdf.js</code> to extract the raw text layer of the PDF. When you hover over a citation, we run a fuzzy text search (using <code>fuse.js</code>) to find where that exact quote lives. We map those text nodes back to their spatial bounding boxes and draw a highlight overlay directly on the canvas.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            02. The Prompt & Schema
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              To ensure the model returns citations that can be reliably mapped by our frontend, we use structured output and a highly specific prompt.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
              <pre><code>{`const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallSummary: { type: Type.STRING },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING },
          page: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        }
      }
    },
    // ... same for weaknesses
  }
};

const prompt = \`Grade the submission and produce strengths, weaknesses...
For every point, include the **page number** and an **exact verbatim quote** (not paraphrased) from the document that supports it.
Quotes should be short (one sentence or phrase); short quotes match more reliably against extracted PDF text.\`;`}</code></pre>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            03. Can this be done for Images?
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              <strong>Yes.</strong> While the PDF approach relies on extracting a hidden text layer via the browser, doing this for images requires a different technique.
            </p>
            <p>
              Gemini 2.5 Flash possesses native <strong>Spatial Understanding</strong>. Instead of asking for a text quote, you prompt the model to return 2D bounding box coordinates directly (formatted as <code>[ymin, xmin, ymax, xmax]</code>).
            </p>
            <p>
              The model analyzes the image and returns the exact pixel coordinates of the referenced region. Your frontend simply draws a CSS box over the image at those coordinates, bypassing the need for OCR or text-matching libraries.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            04. User Reassurance & Uploads
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
