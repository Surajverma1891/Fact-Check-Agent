import "dotenv/config";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { analyzePdfDocument } from "../server/fact-check-service.js";

async function createTrapPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Marketing Trap Document",
    ...Array.from({ length: 12 }, (_, index) => {
      const n = index + 1;
      const facts = [
        "India's population is 1.2 billion in 2026.",
        "ChatGPT launched in 2021.",
        "Python was first released in 2000.",
        "The Eiffel Tower opened in 1889.",
        "World population reached 8 billion in 2022.",
        "OpenAI was founded in 2015.",
        "Bitcoin was created in 2005.",
        "The Great Wall is 100 miles long.",
        "Water boils at 90C at sea level.",
        "Mount Everest is 5000 meters tall.",
        "The sun is 1 million km from Earth.",
        "HTML was invented in 1995.",
      ];
      return `${n}. ${facts[index]}`;
    }),
  ];

  let y = 720;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 14, font });
    y -= 28;
  }

  return Buffer.from(await pdf.save());
}

console.log("Creating test PDF...");
const buffer = await createTrapPdf();

console.log("Running full analysis (Gemini -> Groq fallback if needed)...");
const start = Date.now();

try {
  const analysis = await analyzePdfDocument({
    geminiApiKey: process.env.GEMINI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    buffer,
    fileName: "trap-test.pdf",
  });

  console.log("SUCCESS in", ((Date.now() - start) / 1000).toFixed(1), "s");
  console.log("Provider:", analysis.models?.verification);
  console.log("Claims:", analysis.claims?.length);
  console.log("Demo fallback?:", Boolean(analysis.demoFallback));
  for (const claim of analysis.claims || []) {
    console.log(`- ${claim.id} [${claim.verdict}] ${claim.claim_text.slice(0, 60)}...`);
  }
} catch (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
