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
          A walkthrough of the multi-stage grading pipeline: how documents are analysed, how subjects are detected, and how every piece of feedback gets pinned to an exact location on the page.
        </p>
      </div>

      <div className="space-y-16">

        {/* 01 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            01. Uploading and Reading Documents
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              When you upload a file, it is sent to the Gemini Files API. Gemini stores a temporary copy and gives back a <code>fileUri</code>. That URI can then be included directly in a prompt as a first-class part, alongside your text instructions.
            </p>
            <p>
              Gemini reads PDFs and images natively. You do not need to extract text, run OCR, or build any preprocessing pipeline. You just pass the file reference and ask your question.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Upload the file to Gemini's file storage
const uploadedFile = await ai.files.upload({
  file: tempFilePath,
  config: { mimeType: file.type },
});

// Reference the file in your prompt
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-lite",
  contents: [{
    role: "user",
    parts: [
      { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } },
      { text: "Your grading instructions here..." },
    ],
  }],
});`}</code>
            </pre>
          </div>

          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`
Upload PDF
      │
      ▼
Gemini identifies subject
      │
      ▼
Select grading rubric
      │
      ▼
Grade using rubric
      │
      ▼
Extract citations
      │
      ▼
Validate citations
      │
      ▼
Return JSON`}</code>
            </pre>
          </div>
        </section>

        {/* 02 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            02. Stage 1: Document Analysis
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Before any grading happens, a lightweight first call is made to analyse the submission. The model reads the uploaded file and returns a small JSON object describing what it sees: the subject (e.g. Mathematics, English, History), the assignment type, the estimated education level, and the language of the document.
            </p>
            <p>
              This step runs quickly because the prompt is minimal and the output is small. Its only job is to answer: what kind of homework is this?
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Stage 1 response from Gemini
{
  "subject": "Mathematics",
  "assignmentType": "Problem Set",
  "educationLevel": "Secondary",
  "language": "English",
  "confidence": 0.97
}`}</code>
            </pre>
          </div>
        </section>

        {/* 03 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            03. Stage 2: Rubric Selection
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Once the subject is known, the backend selects the matching grading rubric from a library of subject-specific instruction sets. Each subject has its own rubric file that defines what to focus on.
            </p>
            <p>
              A Mathematics rubric tells the model to check conceptual understanding, working steps, arithmetic accuracy, and formula usage. An English rubric focuses on grammar, vocabulary, organisation, and writing style. A History rubric asks about factual accuracy, use of evidence, and argument quality. The right rubric is loaded and injected into the second Gemini call, keeping prompts focused and precise.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// rubrics/math.ts
export const mathRubric = \`
Evaluate against the following criteria:
1. Conceptual Understanding
2. Working (step-by-step logic)
3. Accuracy (distinguish arithmetic vs reasoning errors)
4. Formula Usage
\`;

// rubrics/index.ts
export function getRubricForSubject(subject: string): string {
  if (subject.includes("math")) return mathRubric;
  if (subject.includes("english")) return englishRubric;
  // ...
}`}</code>
            </pre>
          </div>
        </section>

        {/* 04 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            04. Stage 3 and 4: Grading and Citations
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              The second and main Gemini call does the actual grading. It receives the file again along with the selected rubric and a strict JSON schema. The model must return its feedback in a structured format called criteria cards.
            </p>
            <p>
              Each criteria card corresponds to one grading dimension from the rubric. Inside each card, the model also returns citations: references to the exact location in the document that supports its observation. Each citation includes the filename, page number (for PDFs), and a bounding box coordinate set pointing to the specific region.
            </p>
          </div>
          <div className="mt-4 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// Example output from Stage 3
{
  "subject": "Mathematics",
  "estimatedScore": "72 / 100",
  "overallSummary": "The student demonstrates...",
  "criteriaCards": [
    {
      "criterionName": "Working",
      "feedback": "Several steps are skipped on question 3...",
      "citations": [
        {
          "fileName": "homework.pdf",
          "page": 2,
          "box_2d": [340, 80, 520, 920],
          "confidence": 91,
          "reasoning": "Question 3 working area"
        }
      ]
    }
  ],
  "teacherDiscussionQuestions": [
    "Can you walk me through how you set up the equation on page 2?"
  ]
}`}</code>
            </pre>
          </div>
        </section>

        {/* 05 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            05. Stage 5: Citation Validation
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              After grading, the server runs a validation pass over every citation before sending anything to the browser. Two types of bad citations are removed automatically.
            </p>
            <ul className="space-y-3 pl-4 border-l-2 border-muted">
              <li>
                <strong>Low confidence:</strong> If the model returns a confidence score below 70, the bounding box is stripped. The written feedback still appears, but no highlight is drawn on the document.
              </li>
              <li>
                <strong>Full-page hallucinations:</strong> If the bounding box covers more than 80% of the page area, it is treated as a vague placeholder and removed. Gemini sometimes does this when it cannot pinpoint a specific region.
              </li>
            </ul>
            <p>
              The result is that only high-confidence, spatially specific citations ever reach the frontend.
            </p>
          </div>
        </section>

        {/* 06 */}
        <section>
          <h2 className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-6">
            06. Rendering Highlights Accurately
          </h2>
          <div className="space-y-4 text-foreground leading-relaxed">
            <p>
              Gemini returns bounding boxes as <code>[ymin, xmin, ymax, xmax]</code>, each value scaled from 0 to 1000 where 0 is the top-left corner and 1000 is the bottom-right. Getting those coordinates to appear in exactly the right place on screen requires different approaches for images and PDFs.
            </p>

            <h3 className="font-semibold pt-2">Images: accounting for letterboxing</h3>
            <p>
              Images are displayed with <code>object-contain</code>, which preserves the aspect ratio by adding empty space (letterboxing) along whichever axis does not fill the element. The overlay div is positioned absolutely inside the same container, so if you place it at <code>top: box[0]/10%</code> you are computing a percentage of the <em>element bounding box</em>, not the <em>actual pixel area of the image</em>. On any image that is not perfectly square, the letterbox offset shifts every box by the wrong amount.
            </p>
            <p>
              The fix is to compute the rendered image rect explicitly: derive the scale factor from <code>Math.min(elemW/natW, elemH/natH)</code>, multiply back to get the rendered width and height, then calculate the top and left offsets as <code>(elemDim - renderedDim) / 2</code>. All four overlay positions are then in pixels relative to the image pixel area, not the element box. A <code>ResizeObserver</code> on the image element keeps this recomputed whenever the layout changes.
            </p>

            <h3 className="font-semibold pt-2">PDFs: why percentages give wrong positions</h3>
            <p>
              For PDF pages the letterbox problem does not apply, but a different CSS subtlety does. The overlay div uses <code>position: absolute</code> inside a <code>position: relative</code> wrapper. For absolutely-positioned elements, <code>height: X%</code> resolves to a percentage of the containing block's height. If that containing block's height is determined by its content flow rather than being explicitly set, some browsers resolve the percentage incorrectly or against the wrong measurement. The result is that vertical positions are rendered at the wrong offset even though horizontal positions look fine.
            </p>
            <p>
              The correct approach is to avoid percentage heights entirely and instead measure the exact canvas pixel dimensions at runtime, then use <code>px</code> units.
            </p>

            <h3 className="font-semibold pt-2">PDFs: the timing problem</h3>
            <p>
              <code>react-pdf</code> renders a PDF page asynchronously. The canvas element appears in the DOM after React commits, often one animation frame after the React component finishes rendering. This means a <code>useEffect</code> that runs synchronously after render might query the canvas before it exists, returning zero dimensions.
            </p>
            <p>
              Three mechanisms are layered together to guarantee a measurement is always captured:
            </p>
            <ul className="space-y-2 pl-4 border-l-2 border-muted">
              <li>
                <strong><code>useLayoutEffect</code></strong> fires synchronously after the DOM is mutated, before the browser paints. This catches the canvas immediately if react-pdf has added it by this point.
              </li>
              <li>
                <strong><code>requestAnimationFrame</code></strong> is scheduled inside the layout effect. It fires after the next browser paint, catching the canvas in the common case where react-pdf finishes one frame after the React commit.
              </li>
              <li>
                <strong><code>onRenderSuccess</code></strong> is a prop on the react-pdf <code>Page</code> component that fires when the library itself confirms rendering is complete. This is the most reliable signal but the least timely.
              </li>
            </ul>
            <p>
              A <code>ResizeObserver</code> on the wrapper div keeps all measurements updated if the window is resized after the initial paint.
            </p>
          </div>
          <div className="mt-6 bg-muted/30 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-muted">
            <pre>
              <code>{`// --- Images: letterbox-corrected pixel positions ---
const scale = Math.min(elemW / natW, elemH / natH); // object-contain
const renderedW = natW * scale;
const renderedH = natH * scale;
const offsetLeft = (elemW - renderedW) / 2;
const offsetTop  = (elemH - renderedH) / 2;

const highlight = {
  top:    offsetTop  + (box[0] / 1000) * renderedH + "px",
  left:   offsetLeft + (box[1] / 1000) * renderedW + "px",
  height: ((box[2] - box[0]) / 1000) * renderedH   + "px",
  width:  ((box[3] - box[1]) / 1000) * renderedW   + "px",
};

// --- PDFs: measure actual canvas pixel size, then use px units ---
// Three-layer approach to capture canvas dimensions reliably:

useLayoutEffect(() => {
  measureCanvas();                            // 1. sync after DOM commit
  const raf = requestAnimationFrame(measureCanvas); // 2. after next paint
  return () => cancelAnimationFrame(raf);
}, [currentPage]);

// 3. react-pdf fires this when the canvas is truly ready
<Page onRenderSuccess={measureCanvas} ... />

// Once measured, compute positions in px (not %)
const { width: W, height: H } = pagePixelSize;
const highlight = {
  top:    (box[0] / 1000) * H + "px",
  left:   (box[1] / 1000) * W + "px",
  height: ((box[2] - box[0]) / 1000) * H + "px",
  width:  ((box[3] - box[1]) / 1000) * W + "px",
};`}</code>
            </pre>
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
