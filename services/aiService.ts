
import { Category, Transaction, Debt } from "../types";

/**
 * Универсальный вызов Mistral через серверный прокси
 */
const queryMistral = async (messages: any[], model: string = "mistral-small-latest", responseFormat?: any) => {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        response_format: responseFormat,
        temperature: 0.2
      })
    });

    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Service Error:", error);
    return null;
  }
};

/**
 * Анализ чеков (Pixtral Vision)
 */
export const processVisualInput = async (base64Image: string, categories: Category[]) => {
  const categoryList = categories.map(c => c.name).join(", ");
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: `Извлеки данные из чека. Категории: ${categoryList}. Верни ТОЛЬКО JSON: {"amount": number, "categoryName": "string", "note": "string"}` },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    }
  ];

  const result = await queryMistral(messages, "pixtral-12b-2409", { type: "json_object" });
  try {
    return result ? JSON.parse(result) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Универсальный чат и советы
 */
export const sendChatMessage = async (history: any[], systemInstruction: string) => {
  const messages = [
    { role: "system", content: systemInstruction },
    ...history
  ];
  return await queryMistral(messages);
};
