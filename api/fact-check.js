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
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(400).json({
        error: "The PDF is too large. Please upload a file up to 20 MB.",
      });
      return;
    }

    const { statusCode, message } = normalizeHttpError(error);
    response.status(statusCode).json({ error: message });
  }
});

export default app;
