import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}

interface ClassificationInput {
  descriptor: string;
  songs: string[];
}

/**
 * Classify songs based on descriptor using Gemini.
 * Input: { descriptor, songs }
 * Output: prints and returns boolean array
 */
export async function classifySongs(descriptor: string, songs: string[]): Promise<boolean[]> {

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const model = "gemini-2.0-flash-lite";

  // Build user prompt directly
  const userPrompt = `Descriptor: ${descriptor}
Songs:
${songs.join("\n")}
`;

  const contents = [
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  const config = {
    temperature: 0.1,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      required: ["matches"],
      properties: {
        matches: {
          type: Type.ARRAY,
          description:
            "One boolean per input song in the same order: true if the song matches the descriptor, otherwise false.",
          items: { type: Type.BOOLEAN },
        },
      },
    },
    systemInstruction: [
      {
        text: `You are a classifier that receives:
- descriptor: a single word or short phrase describing mood/genre/tone.
- songs: an ordered list of up to 100 strings, each "<Song> by <Artist>".

For each song, decide whether it reasonably matches the descriptor. Be conservative when uncertain (prefer False). Preserve the exact input order.

Output MUST be a JSON object conforming exactly to the provided schema and nothing else. Use deterministic responses.`,
      },
    ],
  };

  const result = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  try {
    const raw = result.text || "";
    if(!raw.trim()) {
      throw new Error("Empty response from Gemini");
    }
    const parsed = JSON.parse(raw);
    const matches = parsed.matches as boolean[];
    console.log("\nDescriptor:", descriptor);
    console.log("\nGemini matches:", matches);
    return matches;
  } catch (err) {
    console.error("Failed to parse Gemini response:", err);
    console.log("Raw response:\n", result.text);
    return [];
  }
}