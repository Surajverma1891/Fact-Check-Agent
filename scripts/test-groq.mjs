import "dotenv/config";
import { generateGroqJson } from "../server/groq-analysis.js";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("FAIL: GROQ_API_KEY not set in .env");
  process.exit(1);
}

try {
  const text = await generateGroqJson({
    apiKey,
    systemPrompt: "Respond with JSON only.",
    userPrompt: 'Return {"status":"ok"}',
  });
  console.log("Groq API: OK");
  console.log("Sample response:", text.slice(0, 120));
} catch (error) {
  console.error("Groq API: FAIL");
  console.error(error.message);
  process.exit(1);
}
