import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const responseSchema: Schema = {
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
        },
        required: ["point"],
      },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING },
          page: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        },
        required: ["point"],
      },
    },
    talkingPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          point: { type: Type.STRING },
          page: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        },
        required: ["point"],
      },
    },
  },
  required: ["overallSummary", "strengths", "weaknesses", "talkingPoints"],
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      mimeType: file.type,
    });

    const prompt = `Grade the submission and produce strengths, weaknesses, and talking points.
For every point, include the **page number** and an **exact verbatim quote** (not paraphrased) from the document that supports it.
Quotes should be short (one sentence or phrase) — short quotes match more reliably against extracted PDF text.
If a point isn't tied to a specific passage (e.g. "overall structure is clear"), it's fine to omit the quote field — don't force a citation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }, { text: prompt }] }
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
