import { analyzePdfDocument, FactCheckError } from "./fact-check-service.js";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function createHealthPayload() {
  return {
    ok: true,
    service: "fact-check-agent",
    time: new Date().toISOString(),
  };
}

export async function handleUploadedFactCheck({
  geminiApiKey,
  groqApiKey,
  file,
  useDemo = false,
}) {
  if (!file) {
    throw new FactCheckError("Upload a PDF file before starting analysis.", 400);
  }

  const isPdf =
    file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new FactCheckError("Only PDF documents are supported right now.", 400);
  }

  return analyzePdfDocument({
    geminiApiKey,
    groqApiKey,
    buffer: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    useDemo,
  });
}

export function normalizeHttpError(error) {
  if (error instanceof FactCheckError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  const upstreamStatus = Number(error?.status ?? error?.statusCode);

  if (Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus <= 599) {
    return {
      statusCode: upstreamStatus,
      message: humanizeUpstreamError(error, upstreamStatus),
    };
  }

  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : "Unexpected server error while analyzing the PDF.",
  };
}

function humanizeUpstreamError(error, statusCode) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected upstream API error.";
  const normalizedMessage = rawMessage.toLowerCase();
  const upstreamCode = String(error?.code || error?.error?.code || "").toLowerCase();

  if (
    statusCode === 429 &&
    (upstreamCode.includes("insufficient_quota") ||
      normalizedMessage.includes("quota") ||
      normalizedMessage.includes("billing") ||
      normalizedMessage.includes("credit"))
  ) {
    return "Gemini API quota or billing limit reached for the configured key. Wait a few minutes or create a new key at https://aistudio.google.com/apikey, then retry.";
  }

  if (statusCode === 429) {
    return "Gemini is rate limiting this analysis right now. Wait 1–2 minutes, then retry with a smaller PDF.";
  }

  if (statusCode === 401) {
    return "Gemini API authentication failed. Check GEMINI_API_KEY in .env or paste a valid session key on the upload page.";
  }

  return rawMessage;
}
