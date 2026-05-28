import "dotenv/config";

import express from "express";
import multer from "multer";

import {
  handleUploadedFactCheck,
  MAX_FILE_SIZE_BYTES,
  normalizeHttpError,
} from "../server/http-handlers.js";
import { resolveGeminiApiKey, resolveGroqApiKey } from "../server/resolve-api-key.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

app.post(/.*/, upload.single("file"), async (request, response) => {
  try {
    const analysis = await handleUploadedFactCheck({
      geminiApiKey: resolveGeminiApiKey(request),
      groqApiKey: resolveGroqApiKey(request),
      file: request.file,
      useDemo: request.get("x-demo-mode") === "true",
    });

    response.json({ analysis });
  } catch (error) {
    // Log the error so Vercel captures a stack trace in deployment logs
    // This helps diagnose failures when inspecting `vercel logs`.
    // For safety, only include the full stack in the HTTP response when
    // the client provides the `x-debug: true` header.
    console.error(error);
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(400).json({
        error: "The PDF is too large. Please upload a file up to 20 MB.",
      });
      return;
    }

    const { statusCode, message } = normalizeHttpError(error);
    const payload = { error: message };

    // Attach stack trace when debugging is explicitly requested by the client.
    try {
      if (String(request.get("x-debug") || "").toLowerCase() === "true") {
        payload.stack = error instanceof Error ? error.stack : String(error);
      }
    } catch {
      // ignore header parsing errors
    }

    response.status(statusCode).json(payload);
  }
});

export default app;
