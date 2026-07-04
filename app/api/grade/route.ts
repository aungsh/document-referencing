import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const citationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    point: { type: Type.STRING },
    fileName: { type: Type.STRING },
    page: { type: Type.INTEGER },
    quote: { type: Type.STRING },
    box_2d: { 
      type: Type.ARRAY, 
      items: { type: Type.INTEGER },
      description: "For images only. Bounding box [ymin, xmin, ymax, xmax] scaled 0-1000"
    }
  },
  required: ["point"],
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallSummary: { type: Type.STRING },
    strengths: {
      type: Type.ARRAY,
      items: citationSchema,
    },
    weaknesses: {
      type: Type.ARRAY,
      items: citationSchema,
    },
    talkingPoints: {
      type: Type.ARRAY,
      items: citationSchema,
    },
  },
  required: ["overallSummary", "strengths", "weaknesses", "talkingPoints"],
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
      // Sanitize filename: strip non-ASCII characters that break the Gemini SDK
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

    const prompt = `Grade the submission and produce strengths, weaknesses, and talking points.
You have been provided with one or more files (PDFs and/or images). 
For every point you make, you MUST specify the 'fileName' of the document you are referencing.
- If referencing a PDF: include the 'page' number and an exact verbatim 'quote' (not paraphrased). Short quotes match more reliably.
- If referencing an image: DO NOT use 'quote'. Instead, return 'box_2d', which is a 2D bounding box [ymin, xmin, ymax, xmax] scaled from 0 to 1000 representing the region in the image.
If a point isn't tied to a specific passage, it's fine to omit quote/box_2d, but still provide fileName if applicable.`;

    const fileParts = uploadedFiles.map(f => ({ 
      fileData: { fileUri: f.uploadedFile.uri, mimeType: f.uploadedFile.mimeType } 
    }));
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [...fileParts, { text: prompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!response.text) {
      throw new Error("No response text from Gemini");
    }

    const json = JSON.parse(response.text);
    return NextResponse.json(json);

  } catch (error: any) {
    console.error("Error processing grading request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
