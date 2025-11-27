// src/server/llm/client.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as dotenv from "dotenv";

// Load environment variables (API Key)
dotenv.config();

// 1. Initialize the Model
// We export this so we can reuse it in RAG scripts later
export const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // Fast and efficient
  maxOutputTokens: 1024,
  temperature: 0.7, // Creativity balance (0 = Robot, 1 = Poet)
  apiKey: process.env.GOOGLE_API_KEY, // Ensure this is in your .env file
});

// 2. A Simple Helper Function
export const askLLM = async (question: string): Promise<string> => {
  try {
    // Invoke the model with a simple string
    const response = await model.invoke(question);
    
    // LangChain returns a specialized object, we just want the text
    return response.content as string;
  } catch (error) {
    console.error("❌ LLM Call Failed:", error);
    return "Error contacting the AI.";
  }
};