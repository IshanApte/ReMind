import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Export a wrapper that matches the expected interface
export const model = {
  async invoke(prompt: string) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cost-effective model
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    return {
      content: completion.choices[0]?.message?.content || "",
    };
  },
};