# PoC: AI-Graded Homework with Source-Linked Citations

## Goal

Prove out one core interaction: a teacher uploads a student's homework PDF,
Gemini grades it and returns strengths/weaknesses/talking points, and each point
is a **citation** that — on hover — scrolls to and highlights the exact region
of the PDF it came from.

This is a single-page, no-auth, no-database demo. One upload, one grading pass,
one interactive result view. The goal is to validate the citation-to-PDF-highlight
pipeline end to end, not to build the LMS.

---

## Explicitly Out of Scope

- Auth, multi-user, student/teacher roles
- Persistence (DB, file storage) — everything lives in memory for the session
- Editing/re-grading, rubric management, grade export
- Handling non-PDF formats (images, docx)
- Production error handling, retries, rate limiting
- Mobile layout

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| AI | Gemini 2.5 Flash via `@google/genai` |
| PDF rendering | `react-pdf` (wraps pdf.js) |
| Fuzzy text matching | `fuse.js` |
| Styling | shadcn and tailwind |

---

## Architecture Overview

```
┌─────────────┐     upload PDF      ┌──────────────────┐
│   Browser    │ ──────────────────▶ │  /api/grade       │
│  (Next.js)   │                     │  (route handler)  │
└─────────────┘                     └──────────────────┘
       ▲                                     │
       │                                     │ 1. upload file to Gemini File API
       │                                     │ 2. generateContent w/ JSON schema
       │                                     │ 3. return structured grading JSON
       │                                     ▼
       │                            ┌──────────────────┐
       │        JSON response        │   Gemini 2.5      │
       └────────────────────────────│   Flash API        │
                                     └──────────────────┘

Browser then:
  - renders PDF client-side with react-pdf
  - for each citation, fuzzy-matches quote text against page text content
  - on hover: scrolls to page, draws highlight rect over matched text bbox
```

---

## Step-by-Step Implementation

### 1. Project scaffold

```bash
npx create-next-app@latest gemini-citation-poc --typescript --tailwind --app
cd gemini-citation-poc
npm install @google/genai react-pdf fuse.js
```

Set `GEMINI_API_KEY` in `.env.local`.

pdf.js requires a worker file — copy it into `/public` per `react-pdf` setup docs
(this trips people up; flag it explicitly in the build so the agent doesn't skip it).

---

### 2. Upload UI (`app/page.tsx`)

- Single file input, PDF only (`accept="application/pdf"`)
- On submit: POST the file as `FormData` to `/api/grade`
- Show a loading state ("Grading...") while waiting
- Store the returned grading JSON + the original file (as an object URL) in
  React state — this is what drives the rest of the UI

---

### 3. Grading API route (`app/api/grade/route.ts`)

Responsibilities:
1. Receive the uploaded PDF from `FormData`
2. Upload it to Gemini's File API (`ai.files.upload`)
3. Call `generateContent` with:
   - the file reference
   - a grading prompt (see below)
   - a `responseSchema` forcing structured JSON output with verbatim quotes
4. Return the parsed JSON to the client

**Grading prompt — key instructions to bake in:**
- Grade the submission and produce strengths, weaknesses, and talking points
- For every point, include the **page number** and an **exact verbatim quote**
  (not paraphrased) from the document that supports it
- Quotes should be short (one sentence or phrase) — short quotes match more
  reliably against extracted PDF text
- If a point isn't tied to a specific passage (e.g. "overall structure is
  clear"), it's fine to omit the quote field — don't force a citation

**Response schema shape:**
```json
{
  "overallSummary": "string",
  "strengths": [{ "point": "string", "page": 1, "quote": "string" }],
  "weaknesses": [{ "point": "string", "page": 1, "quote": "string" }],
  "talkingPoints": [{ "point": "string", "page": 1, "quote": "string" }]
}
```

---

### 4. PDF viewer + text extraction (`components/PdfViewer.tsx`)

- Render the PDF with `react-pdf`'s `<Document>` / `<Page>` components
- On load, for each page, call `page.getTextContent()` and cache:
  - the concatenated page text
  - the list of text items with their `transform` (x/y position) and `width`/`height`
- This cache is what citation hovering will search against

---

### 5. Quote-matching logic (`lib/matchQuote.ts`)

This is the core risk area of the PoC — isolate it as its own tested module.

- Input: a quote string + page number + the cached text items for that page
- Use `fuse.js` (or a simpler sliding-window Levenshtein match) to find the
  best-matching substring in the page's concatenated text, tolerating minor
  whitespace/OCR differences
- Map the matched character range back to the underlying text items
- Return bounding box(es): `{ x, y, width, height }` in PDF coordinate space
  for each matched item (a quote may span multiple text items/lines — return
  an array of rects, not just one)
- If no confident match is found (score below threshold), return `null` —
  the UI should fall back to "jump to page" without a highlight rather than
  drawing a wrong box

---

### 6. Citation list + hover interaction (`components/CitationPanel.tsx` + `components/HighlightOverlay.tsx`)

- Render strengths/weaknesses/talking points as a list, each item is a
  hoverable/clickable `<CitationChip>`
- On hover:
  - scroll the PDF viewer to the cited page
  - render an absolutely-positioned overlay `<div>` per matched rect, on top
    of the PDF canvas, using the coordinates from step 5
  - show the quote text in a small tooltip as a fallback/confirmation
- On mouse leave: remove the overlay
- If matching failed (null result): still jump to the page, skip the highlight,
  show a small "quote not found" indicator — don't fail silently

---

### 7. Wire it together

- `page.tsx` holds: uploaded file object URL, grading result JSON, hovered
  citation ID
- Passes hovered citation state down to both `PdfViewer` (to scroll/highlight)
  and `CitationPanel` (to render the list)
- Simple two-column layout: PDF viewer on one side, citation panel on the other

---

## Validation Checklist (what "done" looks like for the PoC)

- [ ] Upload a real multi-page homework PDF and get back grading JSON
- [ ] Every citation shows a page number and quote
- [ ] Hovering a citation scrolls to the right page within ~1 second
- [ ] At least ~80% of citations produce a visible, correctly-positioned highlight
      (some quote-matching misses are expected and acceptable for a PoC)
- [ ] Failed matches degrade gracefully (page jump only, no crash, no wrong highlight)
- [ ] Total round-trip (upload → graded result) completes in a reasonable time
      for a 5–10 page PDF (expect several seconds, dominated by the Gemini call)

---

## Known Risks / Things to Watch

- **Quote fidelity**: Gemini may still slightly paraphrase even when told not to.
  If match rates are poor, tighten the prompt further (e.g. "copy the exact
  characters as they appear, including punctuation") or ask for shorter quotes.
- **pdf.js worker setup**: a common source of silent breakage in `react-pdf`
  projects — confirm the worker is correctly served before debugging anything else.
- **Multi-line quotes**: a quote spanning a line break in the PDF's text layer
  may need to be matched as multiple text items — don't assume one rect per quote.
- **Scanned/image-based PDFs**: text extraction (and therefore highlighting)
  won't work if the PDF has no real text layer. For the PoC, use a text-based
  PDF (typed homework), not a scanned handwritten one.

---

## Suggested Build Order for the Agent

1. Scaffold Next.js app, confirm `react-pdf` renders a static test PDF
2. Build `/api/grade` route with Gemini call + schema, test with `curl`/Postman
   independent of any UI
3. Build upload UI, wire to the API route, confirm JSON renders as a plain list
4. Add PDF viewer, extract text content per page, log it to console
5. Build `matchQuote` as an isolated function, unit-test it against sample
   quotes/pages before wiring to hover
6. Wire hover interaction last, once matching is proven to work standalone