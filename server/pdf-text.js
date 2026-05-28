import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse/lib/pdf-parse.js");

const MAX_TEXT_CHARS = 100000;

export async function extractPdfText(buffer) {
  const result = await pdf(buffer);
  const text = String(result.text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 80) {
    throw new Error(
      "Could not extract enough text from this PDF. Use a text-based PDF (not a scanned image-only file).",
    );
  }

  return text.slice(0, MAX_TEXT_CHARS);
}
