import { NextRequest } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { getRubricForSubject } from "@/rubrics";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const metadataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    assignmentType: { type: Type.STRING },
    educationLevel: { type: Type.STRING },
    language: { type: Type.STRING },
    confidence: { type: Type.NUMBER, description: "0 to 1" },
  },
  required: ["subject", "assignmentType", "educationLevel", "language", "confidence"],
};

const citationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fileName: { type: Type.STRING },
    page: { type: Type.INTEGER },
    box_2d: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Bounding box [ymin, xmin, ymax, xmax] scaled 0-1000"
    },
    confidence: { type: Type.INTEGER, description: "0-100 score of how confident you are in this citation" },
    reasoning: { type: Type.STRING, description: "Brief reasoning for drawing this box" }
  },
  required: ["fileName", "confidence"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    estimatedScore: { type: Type.STRING },
    overallSummary: { type: Type.STRING },
    criteriaCards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterionName: { type: Type.STRING },
          feedback: { type: Type.STRING },
          citations: {
            type: Type.ARRAY,
            items: citationSchema
          }
        },
        required: ["criterionName", "feedback", "citations"]
      }
    },
    teacherDiscussionQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["subject", "estimatedScore", "overallSummary", "criteriaCards", "teacherDiscussionQuestions"]
};

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const formData = await req.formData();
        const files = formData.getAll("file") as File[];
        if (!files || files.length === 0) {
          emit({ type: "error", message: "No files provided" });
          controller.close();
          return;
        }

        // Stage 1: Upload
        emit({ type: "step", index: 0, label: "Uploading files to Gemini..." });
        const uploadedFiles = [];
        for (const file of files) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = file.name.replace(/[^\x00-\x7F]/g, "_");
          const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);
          await writeFile(tempFilePath, buffer);
          const uploadedFile = await ai.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type, displayName: file.name },
          });
          uploadedFiles.push({ uploadedFile, originalName: file.name });
        }
        emit({ type: "step_done", index: 0 });

        const fileManifest = uploadedFiles.map((f, i) => `File ${i + 1}: "${f.originalName}"`).join("\n");
        const fileParts = uploadedFiles.map(f => ({
          fileData: { fileUri: f.uploadedFile.uri, mimeType: f.uploadedFile.mimeType }
        }));

        // Stage 2: Document Analysis
        emit({ type: "step", index: 1, label: "Analysing document..." });
        const metadataPrompt = `Analyze the uploaded documents. Return the primary subject, assignment type, estimated education level, language, and your confidence score (0 to 1).`;
        const metadataResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [{ role: "user", parts: [...fileParts, { text: metadataPrompt }] }],
          config: { responseMimeType: "application/json", responseSchema: metadataSchema },
        });
        if (!metadataResponse.text) throw new Error("No metadata response");
        const metadata = JSON.parse(metadataResponse.text);
        emit({ type: "step_done", index: 1, detail: metadata.subject });

        // Stage 3: Rubric Selection
        emit({ type: "step", index: 2, label: `Selecting rubric for ${metadata.subject}...` });
        const rubric = getRubricForSubject(metadata.subject);
        emit({ type: "step_done", index: 2 });

        // Stage 4: Grading & Citation Extraction
        emit({ type: "step", index: 3, label: "Grading submission..." });
        const gradingPrompt = `You are an expert teacher. The uploaded files are:
${fileManifest}

Apply the following grading rubric based on the detected subject (${metadata.subject}):
${rubric}

Provide an estimated score, overall summary, criteria-based feedback, and discussion questions.

For every citation in your criteria cards:
- You MUST set 'fileName' to the EXACT filename listed above.
- You MUST return 'box_2d' as [ymin, xmin, ymax, xmax] scaled from 0 to 1000 pointing to the exact region.
- For PDF files, you MUST include the 'page' number (starting from 1). NEVER omit the page for a PDF citation.
- Include a 'confidence' score from 0 to 100 for how accurately the box_2d matches the referenced region.
If a point is not tied to any specific region, still include fileName but omit box_2d.`;

        const gradingResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [{ role: "user", parts: [...fileParts, { text: gradingPrompt }] }],
          config: { responseMimeType: "application/json", responseSchema: responseSchema },
        });
        if (!gradingResponse.text) throw new Error("No grading response");
        const result = JSON.parse(gradingResponse.text);
        emit({ type: "step_done", index: 3 });

        // Stage 5: Citation Validation
        emit({ type: "step", index: 4, label: "Validating citations..." });
        if (result.criteriaCards) {
          for (const card of result.criteriaCards) {
            if (card.citations) {
              card.citations = card.citations.map((c: any) => {
                if (c.confidence < 70) {
                  delete c.box_2d;
                  delete c.page;
                } else if (c.box_2d && Array.isArray(c.box_2d) && c.box_2d.length === 4) {
                  const [ymin, xmin, ymax, xmax] = c.box_2d;
                  const area = (ymax - ymin) * (xmax - xmin);
                  c.area = area;
                  // if (area > 8000000) {
                  //   delete c.box_2d;
                  //   delete c.page;
                  // }
                }
                return c;
              });
            }
          }
        }
        emit({ type: "step_done", index: 4 });

        emit({ type: "result", data: result });
        controller.close();

      } catch (error: any) {
        console.error("Error processing grading request:", error);
        emit({ type: "error", message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

