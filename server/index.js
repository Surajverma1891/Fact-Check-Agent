import "dotenv/config";

import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createHealthPayload,
  handleUploadedFactCheck,
  MAX_FILE_SIZE_BYTES,
  normalizeHttpError,
} from "./http-handlers.js";
import { resolveGeminiApiKey, resolveGroqApiKey } from "./resolve-api-key.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json(createHealthPayload());
});

app.post("/api/fact-check", upload.single("file"), async (request, response) => {
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
    response.status(statusCode).json({
      error: message,
    });
  }
});

app.use(express.static(distDir));

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT || 8787);

app.listen(port, () => {
  console.log(`FactCheck Agent server listening on http://localhost:${port}`);
});
