// src/server/list_models.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const main = async () => {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  
  try {
    console.log("🔍 Checking available models for your API Key...");
    const modelResponse = await genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init
    
    // Fetch the list
    // (We use the raw API client via the factory to access listModels if available, 
    // or we just assume the API works if we can't list. 
    // Actually, the SDK has a specific manager for this, but let's try a direct fetch to be safe).
    
    // Simpler approach with the SDK's built-in fetch if available, 
    // but the easiest way is to use the raw fetch to avoid SDK typing issues.
    const apiKey = process.env.GOOGLE_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.models) {
      console.log("\n✅ AVAILABLE MODELS:");
      data.models.forEach((m: any) => {
        // Filter for generation models
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(` - ${m.name.replace("models/", "")}`);
        }
      });
    } else {
      console.error("❌ No models found. Response:", data);
    }

  } catch (error) {
    console.error("❌ Failed to list models:", error);
  }
};

main();