import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}


/**
 * Classify songs based on descriptor using Gemini.
 * Input: descriptor (string) and songs (array of "<Song> by <Artist>")
 * Output: boolean array (true if matches descriptor)
 */
export async function classifySongs(descriptor: string, songs: string[]): Promise<boolean[]> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const model = "gemini-2.0-flash-lite";
  const BATCH_SIZE = 30;
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const batches = chunk(songs, BATCH_SIZE);
  const allMatches: boolean[] = [];

  console.log(`Classifying ${songs.length} songs in ${batches.length} batch(es) (up to ${BATCH_SIZE} per batch).`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`→ Processing batch ${i + 1}/${batches.length} (${batch.length} songs)`);

    const userPrompt = `Descriptor: ${descriptor}
Songs:
${batch.join("\n")}
`;

    const contents = [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ];

    const config = {
      temperature: 0.01,
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
- songs: an ordered list of up to 30 strings, each "<Song> by <Artist>".

For each song, decide whether it reasonably matches the descriptor. Be conservative when uncertain (prefer False). Preserve the exact input order.
Baseline each song independently. Ensure that the number of outputs match the number of inputs without omission or reordering.
Output MUST be a JSON object conforming exactly to the provided schema and nothing else. Use deterministic responses.`,
        },
      ],
    };

    try {
      const result = await ai.models.generateContent({ model, contents, config });
      const raw = result.text || "";
      if (!raw.trim()) throw new Error("Empty response from Gemini");

      const parsed = JSON.parse(raw);
      const matches = parsed.matches as boolean[];

      // Expect the model to return one boolean per input song in the batch.
      if (!Array.isArray(matches)) {
        console.warn(`Batch ${i + 1}: Gemini returned non-array 'matches' -> falling back to all-false for this batch.`);
        allMatches.push(...Array(batch.length).fill(false));
      } else if (matches.length !== batch.length) {
        console.warn(
          `Batch ${i + 1}: Unexpected matches length (expected ${batch.length}, got ${matches.length}). ` +
          "Filling missing entries with false to preserve input order."
        );
        // If model returned fewer/extra items, preserve order and fill/truncate
        const corrected = matches.slice(0, batch.length);
        if (corrected.length < batch.length) corrected.push(...Array(batch.length - corrected.length).fill(false));
        allMatches.push(...corrected);
      } else {
        allMatches.push(...matches);
      }
    } catch (err) {
      console.error(`Gemini classification failed for batch ${i + 1}:`, err);
      allMatches.push(...Array(batch.length).fill(false)); // fallback: all false for this batch
    }
  }
  return allMatches;
}