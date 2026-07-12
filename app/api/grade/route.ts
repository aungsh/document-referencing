import { NextRequest, NextResponse } from "next/server";
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
  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedFiles = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\x00-\x7F]/g, "_");
      const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);
      await writeFile(tempFilePath, buffer);

      const uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: file.type,
          displayName: file.name,
        }
      });
      uploadedFiles.push({ uploadedFile, originalName: file.name });
    }

    const fileManifest = uploadedFiles
      .map((f, i) => `File ${i + 1}: "${f.originalName}"`)
      .join("\n");
      
    const fileParts = uploadedFiles.map(f => ({ 
      fileData: { fileUri: f.uploadedFile.uri, mimeType: f.uploadedFile.mimeType } 
    }));

    // Stage 1: Document Analysis
    const metadataPrompt = `Analyze the uploaded documents. Return the primary subject, assignment type, estimated education level, language, and your confidence score (0 to 1).`;
    const metadataResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [...fileParts, { text: metadataPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: metadataSchema,
      },
    });

    if (!metadataResponse.text) throw new Error("No metadata response");
    const metadata = JSON.parse(metadataResponse.text);

    // Stage 2: Rubric Selection
    const rubric = getRubricForSubject(metadata.subject);

    // Stage 3 & 4: Grading & Citation Extraction
    const gradingPrompt = `You are an expert teacher. The uploaded files are:
${fileManifest}

Apply the following grading rubric based on the detected subject (${metadata.subject}):
${rubric}

Provide an estimated score, overall summary, criteria-based feedback, and discussion questions.
For every citation in your criteria cards, you MUST set 'fileName' to the EXACT filename listed above.
- For citations, DO NOT use quotes. Instead, return 'box_2d', which is a 2D bounding box [ymin, xmin, ymax, xmax] scaled from 0 to 1000 representing the region referenced. 
- For PDFs, you MUST also include the 'page' number.
- Include a confidence score (0-100) for your citation accuracy.
If a point isn't tied to a specific passage, still provide the correct fileName but omit box_2d.`;

    const gradingResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [...fileParts, { text: gradingPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!gradingResponse.text) throw new Error("No grading response");
    const result = JSON.parse(gradingResponse.text);

    // Stage 5: Citation Validation
    if (result.criteriaCards) {
      for (const card of result.criteriaCards) {
        if (card.citations) {
          card.citations = card.citations.map((c: any) => {
            // Reject low confidence
            if (c.confidence < 70) {
              delete c.box_2d;
              delete c.page;
            } else if (c.box_2d && Array.isArray(c.box_2d) && c.box_2d.length === 4) {
              const [ymin, xmin, ymax, xmax] = c.box_2d;
              const area = (ymax - ymin) * (xmax - xmin);
              // Reject full page highlights (> 80% of 1000x1000)
              if (area > 800000) {
                delete c.box_2d;
                delete c.page;
              }
            }
            return c;
          });
        }
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error processing grading request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
