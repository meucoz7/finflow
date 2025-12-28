
import { GoogleGenAI } from "@google/genai";

// Fix: Implement sendChatMessage to provide AI-powered financial insights using Gemini.
export async function sendChatMessage(
  history: { role: string; content: string }[],
  systemInstruction: string
): Promise<string | undefined> {
  // Always initialize the client with the API key from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Map the application-level message roles to Gemini API roles ('user' and 'model').
  const contents = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    // Utilize gemini-3-flash-preview for fast and cost-effective text generation.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // Directly access the text property of the response object.
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
