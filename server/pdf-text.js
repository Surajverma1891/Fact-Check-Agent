import { PDFParse } from "pdf-parse";

const MAX_TEXT_CHARS = 100000;

export async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
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
