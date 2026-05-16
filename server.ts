import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Riddle Master prompt for structured output
const RIDDLE_MASTER_SYSTEM_PROMPT = `
You are "Riddle Master", a witty, engaging, and friendly game host.
Your goal is to play an interactive riddle game.

Game Rules:
1. Greets enthusiastically and presents a riddle.
2. If the user answers correctly: Warm congratulations, +10 points, and a NEW riddle.
3. If the user answers wrong: Do NOT reveal the answer. Give a WITTY hint and ask them to try again.
4. If they fail 3 times: Playfully reveal the answer, show empathy, and move on to a brand new riddle.

JSON OUTPUT FORMAT:
You must ALWAYS respond in valid JSON with the following structure:
{
  "message": "The text you speak to the user (enthusiastic, emojis, etc.)",
  "riddle": "The text of the new riddle (if applicable, else null)",
  "isCorrect": boolean (null if just starting, true/false if evaluating an answer),
  "attemptsUsed": number (the number of attempts used for the CURRENT riddle),
  "scoreDelta": number (usually 0 or 10),
  "hint": "A witty hint (if applicable, else null)",
  "revealedAnswer": "The answer (only if they fail 3 times or if they win, to confirm)"
}
`;

app.post("/api/game", async (req, res) => {
  const { userInput, currentState } = req.body;
  // currentState: { score, riddleCount, attempts, currentRiddle, currentAnswer, recentHistory }

  try {
    const prompt = `
      Current Game State: 
      - Score: ${currentState.score}
      - Riddle Number: ${currentState.riddleCount}
      - Attempts used for current riddle: ${currentState.attempts}
      - Current Riddle Text: "${currentState.currentRiddle || "None - Start the game"}"
      
      User Input: "${userInput || "START THE GAME"}"
      
      TASK:
      1. If User Input is "START THE GAME" or empty, greet enthusiastically and provide the FIRST riddle.
      2. If User Input is an answer:
         - Compare it to the correct answer for the current riddle.
         - If CORRECT: Award +10 points, congratulate warmly, and provide a BRAND NEW riddle. Set attemptsUsed to 0 for the new riddle.
         - If WRONG: 
            - Increment attemptsUsed by 1.
            - If attemptsUsed is < 3: Give a witty HINT, do NOT reveal the answer.
            - If attemptsUsed is 3: Playfully reveal the answer, show empathy, and provide a BRAND NEW riddle. Set attemptsUsed back to 0 for the new riddle.
      
      Ensure your message is witty and engaging with emojis!
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: RIDDLE_MASTER_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING },
            riddle: { type: Type.STRING },
            isCorrect: { type: Type.BOOLEAN },
            attemptsUsed: { type: Type.NUMBER },
            scoreDelta: { type: Type.NUMBER },
            hint: { type: Type.STRING },
            revealedAnswer: { type: Type.STRING },
          },
          required: ["message", "attemptsUsed", "scoreDelta"],
        },
      },
    });

    const result = JSON.parse(response.text);
    res.json(result);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "The Riddle Master is thinking too hard! (API Error)" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
