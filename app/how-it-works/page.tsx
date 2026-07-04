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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Demo
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
          How it Works
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          How to use the Gemini API to analyze documents and get back
          structured, source-linked responses.
        </p>
      </div>

      <div className="space-y-16">
        {/* 01 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            01. The Core Idea
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              The model reads the document as part of the prompt and generates a
              response grounded in its contents. You don&apos;t need to extract
              text yourself or build a RAG pipeline, the model does it natively.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Step 1: Upload the file
const uploadedFile = await ai.files.upload({
  file: tempFilePath,
  config: { mimeType: file.type },
});

// Step 2: Pass the fileUri into the prompt
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [{
    role: "user",
    parts: [
      // The document itself — Gemini reads this natively
      { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
      // Your instructions
      { text: prompt },
    ],
  }],
});`}</code>
            </pre>
          </div>
        </section>

        {/* 02 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            02. Getting Structured References Back
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              By default, Gemini returns free-form text. To get back
              machine-readable citations, you use{" "}
              <strong>structured output</strong>, defining a JSON schema so the
              model is forced to return a specific shape.
            </p>
            <p>
              For each point the model makes, we instruct it to include the
              source file name, the page number, and an exact verbatim quote
              from the document. This is the key: the model is not summarizing
              or paraphrasing, it must pull a real string directly from the
              source.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Define the schema for each citation
const citationSchema = {
  type: Type.OBJECT,
  properties: {
    point:    { type: Type.STRING },   // the grading observation
    fileName: { type: Type.STRING },   // which file it came from
    page:     { type: Type.INTEGER },  // page number (PDFs)
    quote:    { type: Type.STRING },   // verbatim text from the document
    box_2d:   { type: Type.ARRAY },    // region coordinates (images)
  },
};

// Pass the schema to the API call
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [...],
  config: {
    responseMimeType: "application/json",
    responseSchema: responseSchema,   // enforces the output shape
  },
});

// The response is valid JSON matching your schema
const result = JSON.parse(response.text);
// result.strengths[0].quote === "exact text from the document"`}</code>
            </pre>
          </div>
        </section>

        {/* 03 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            03. PDFs vs Images
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Both work the same way at the API level, you upload the file and
              pass the <code>fileUri</code>. The difference is in what you ask
              the model to return.
            </p>
            <ul className="space-y-3 pl-4 border-l-2 border-muted">
              <li>
                <strong>PDFs:</strong> Ask the model for a <code>quote</code> (a
                verbatim sentence from the text) and a <code>page</code> number.
                The model can read the full text layer of a PDF natively.
              </li>
              <li>
                <strong>Images:</strong> There is no text layer to quote.
                Instead, Gemini&apos;s native{" "}
                <strong>spatial understanding</strong> lets you ask it to return{" "}
                <code>box_2d</code> coordinates, a bounding box{" "}
                <code>[ymin, xmin, ymax, xmax]</code> (scaled 0–1000) pointing
                to the exact region of the image it is referencing. No OCR
                required.
              </li>
            </ul>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Prompt that handles both file types
const prompt = \`
The uploaded files are:
File 1: "homework.pdf"
File 2: "photo.png"

For every point, set 'fileName' to the exact filename above.
- PDF: include 'page' and a verbatim 'quote' from the text.
- Image: return 'box_2d' as [ymin, xmin, ymax, xmax] (0–1000).
\`;

// Example output from Gemini:
{
  "strengths": [
    {
      "point": "Clear argument structure",
      "fileName": "homework.pdf",
      "page": 2,
      "quote": "The evidence suggests a strong correlation..."
    },
    {
      "point": "Neat diagram layout",
      "fileName": "photo.png",
      "box_2d": [120, 80, 400, 650]
    }
  ]
}`}</code>
            </pre>
          </div>
        </section>

        {/* 04 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            04. User Reassurance &amp; Uploads
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              To reassure users, you can show a popup confirming their document
              was received and display the raw content on screen.{" "}
              <strong>This is independent of the Gemini API</strong>.
            </p>
            <p>
              The upload confirmation is standard frontend UI triggered when a
              file is saved to your database or cloud storage (e.g., S3).
              Showing the raw document alongside the AI response is then just a
              matter of rendering the file from its stored URL in a viewer.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-20 pt-8 border-t border-muted">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-foreground)",
          }}
        >
          Try the Demo
        </Link>
      </div>
    </main>
  );
}
