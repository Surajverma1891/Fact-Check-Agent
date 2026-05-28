import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { buildDemoFallbackAnalysis } from "./demo-fallback.js";
import {
  generateGroqJson,
  getGroqExtractionModelName,
  getGroqVerificationModelName,
  GROQ_VERIFICATION_MODEL,
} from "./groq-analysis.js";
import { extractPdfText } from "./pdf-text.js";

const ANALYSIS_MODEL = "gemini-2.5-flash";
const MAX_CLAIMS = 15;
const VERIFY_BATCH_SIZE = 4;
const GEMINI_RETRY_DELAYS_MS = [15000, 30000];
const VERCEL_MAX_CLAIMS = 8;
const VERCEL_VERIFY_BATCH_SIZE = 8;
const LOCAL_GEMINI_RETRY_DELAYS_MS = GEMINI_RETRY_DELAYS_MS;
const VERCEL_GEMINI_RETRY_DELAYS_MS = [4000];

const CLAIM_TYPES = [
  "statistic",
  "date",
  "financial",
  "technical",
  "operational",
  "other",
];
const VERDICTS = ["Verified", "Inaccurate", "False"];
const REASONING_LABELS = [
  "matches_current_sources",
  "outdated_or_partial",
  "contradicted_or_unsupported",
];

function asText(value, fallback = "") {
  if (value == null) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function isVercelRuntime() {
  return (
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

function getGeminiRetryDelays() {
  return isVercelRuntime() ? VERCEL_GEMINI_RETRY_DELAYS_MS : LOCAL_GEMINI_RETRY_DELAYS_MS;
}

function getVerifyBatchSize() {
  return isVercelRuntime() ? VERCEL_VERIFY_BATCH_SIZE : VERIFY_BATCH_SIZE;
}

function getVerificationDelayMs() {
  if (isVercelRuntime()) {
    return 0;
  }

  return 900;
}

function getRuntimeClaimLimit() {
  if (isVercelRuntime()) {
    return VERCEL_MAX_CLAIMS;
  }

  return MAX_CLAIMS;
}

function asConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) {
    return 50;
  }

  return Math.max(1, Math.min(100, Math.round(confidence)));
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "") || "unknown";
  } catch {
    return "unknown";
  }
}

function normalizeUrl(value) {
  const raw = asText(value);
  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

function normalizeSource(source) {
  const url = normalizeUrl(source?.url);
  if (!url) {
    return null;
  }

  return {
    title: asText(source?.title, "Source"),
    url,
    publisher: asText(source?.publisher, "Unknown publisher"),
    domain: asText(source?.domain, domainFromUrl(url)),
  };
}

function normalizeSources(sources) {
  const normalized = (Array.isArray(sources) ? sources : [])
    .map(normalizeSource)
    .filter(Boolean)
    .slice(0, 3);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      title: "Web search",
      url: "https://www.google.com",
      publisher: "Google",
      domain: "google.com",
    },
  ];
}

function normalizeVerifiedClaim(claim) {
  return {
    claim_id: asText(claim?.claim_id, "C0"),
    verdict: VERDICTS.includes(claim?.verdict) ? claim.verdict : "False",
    confidence: asConfidence(claim?.confidence),
    explanation: asText(
      claim?.explanation,
      "Verification completed with limited structured detail from the model.",
    ),
    corrected_fact: asText(claim?.corrected_fact, "See explanation for the supported fact."),
    reasoning_label: REASONING_LABELS.includes(claim?.reasoning_label)
      ? claim.reasoning_label
      : "contradicted_or_unsupported",
    sources: normalizeSources(claim?.sources),
  };
}

const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  publisher: z.string().min(1),
  domain: z.string().min(1),
});

const ExtractedClaimOnlySchema = z.object({
  claim_text: z.string().min(1),
  claim_type: z.enum(CLAIM_TYPES),
  page_reference: z.string().min(1),
  evidence_snippet: z.string().min(1).max(260),
});

const ExtractionOnlySchema = z.object({
  document_title: z.string().min(1),
  document_summary: z.string().min(1),
  claims: z.array(ExtractedClaimOnlySchema).min(1).max(MAX_CLAIMS),
});

const VerifiedClaimSchema = z.object({
  claim_id: z.string().min(1),
  verdict: z.enum(VERDICTS),
  confidence: z.number().min(1).max(100),
  explanation: z.string().min(1),
  corrected_fact: z.string().min(1),
  reasoning_label: z.enum(REASONING_LABELS),
  sources: z.array(SourceSchema).min(1).max(3),
});

function createVerificationBatchSchema(expectedClaimCount) {
  return z.object({
    batch_summary: z.string().min(1),
    claims: z.array(VerifiedClaimSchema).min(1).max(expectedClaimCount),
  });
}

function normalizeExtractedClaimOnly(claim) {
  return {
    claim_text: asText(claim?.claim_text, "A factual claim extracted from the uploaded document."),
    claim_type: CLAIM_TYPES.includes(claim?.claim_type) ? claim.claim_type : "other",
    page_reference: asText(claim?.page_reference, "Unknown page"),
    evidence_snippet: asText(claim?.evidence_snippet, "See claim text.").slice(0, 260),
  };
}

function normalizeExtractionOnlyPayload(raw) {
  const claims = (Array.isArray(raw?.claims) ? raw.claims : [])
    .map(normalizeExtractedClaimOnly)
    .slice(0, MAX_CLAIMS);

  if (claims.length === 0) {
    throw new FactCheckError("The model did not extract any claims from this PDF.", 502);
  }

  return {
    document_title: asText(raw?.document_title, "Uploaded document"),
    document_summary: asText(
      raw?.document_summary,
      "Document submitted for automated fact checking.",
    ),
    claims,
  };
}

function normalizeVerificationPayload(raw, expectedClaimCount) {
  const claims = (Array.isArray(raw?.claims) ? raw.claims : [])
    .map(normalizeVerifiedClaim)
    .slice(0, expectedClaimCount);

  if (claims.length === 0) {
    throw new FactCheckError("The model did not return verification results.", 502);
  }

  return {
    batch_summary: asText(raw?.batch_summary, "Claim verification completed."),
    claims,
  };
}

function buildExtractionInstructions() {
  return `
You extract factual claims from documents for fact-checking.

Read the ENTIRE document text from start to end and extract EVERY distinct verifiable claim, including:
- every numbered item (1, 2, 3 … 12, etc.) on a page
- every bullet with a statistic, date, percentage, or technical fact
- every standalone sentence with numbers, rankings, timelines, or measurable assertions

Rules:
- Do NOT stop after the first 3 items — include ALL numbered questions/statements on each page.
- One claim per numbered/bullet item (12 items on a page → 12 claims).
- Skip duplicates, vague slogans, and pure opinions.
- Cap at ${MAX_CLAIMS} claims only if the document has more than that.

Return JSON only (no markdown fences):
{
  "document_title": string,
  "document_summary": string,
  "claims": [
    {
      "claim_text": string,
      "claim_type": "statistic" | "date" | "financial" | "technical" | "operational" | "other",
      "page_reference": string,
      "evidence_snippet": string
    }
  ]
}
`;
}

function buildVerificationInstructions(todayIsoDate) {
  return `
You are an evidence-first fact checker as of ${todayIsoDate}.

Verify EVERY claim in the input list using your knowledge of current public facts.

Verdict rules:
- Verified: substantially matches reliable evidence.
- Inaccurate: related to reality but wrong number/date/outdated/misleading.
- False: contradicted or unsupported.

Return exactly one record per claim_id. Include 1-2 sources (title, url, publisher, domain) per claim.

Return JSON only (no markdown fences):
{
  "batch_summary": string,
  "claims": [
    {
      "claim_id": string,
      "verdict": "Verified" | "Inaccurate" | "False",
      "confidence": number,
      "explanation": string,
      "corrected_fact": string,
      "reasoning_label": "matches_current_sources" | "outdated_or_partial" | "contradicted_or_unsupported",
      "sources": [{ "title": string, "url": string, "publisher": string, "domain": string }]
    }
  ]
}
`;
}

let analysisQueue = Promise.resolve();

export class FactCheckError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "FactCheckError";
    this.statusCode = statusCode;
  }
}

export async function analyzePdfDocument({
  geminiApiKey,
  groqApiKey,
  buffer,
  fileName,
  useDemo = false,
}) {
  if (useDemo) {
    return buildDemoFallbackAnalysis(fileName, buffer?.length ?? 0);
  }

  if (!geminiApiKey && !groqApiKey) {
    throw new FactCheckError(
      "No API key configured. Set GEMINI_API_KEY and/or GROQ_API_KEY in .env (Groq free key: https://console.groq.com).",
      400,
    );
  }

  if (isVercelRuntime()) {
    return runAnalysisCore({ geminiApiKey, groqApiKey, buffer, fileName });
  }

  let releaseQueue;

  const previous = analysisQueue;
  analysisQueue = new Promise((resolve) => {
    releaseQueue = resolve;
  });

  await previous;

  try {
    return runAnalysisCore({ geminiApiKey, groqApiKey, buffer, fileName });
  } finally {
    releaseQueue();
  }
}

async function runAnalysisCore({ geminiApiKey, groqApiKey, buffer, fileName }) {
  let documentText;

  try {
    documentText = await extractPdfText(buffer);
  } catch (error) {
    throw new FactCheckError(
      error instanceof Error ? error.message : "Failed to read PDF text.",
      400,
    );
  }

  if (geminiApiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: geminiApiKey });
      return await runGeminiTextAnalysis(client, documentText, fileName, buffer.length);
    } catch (error) {
      if (getErrorStatus(error) !== 429 || !groqApiKey) {
        throw error;
      }
    }
  }

  if (groqApiKey) {
    return await runGroqTextAnalysis(groqApiKey, documentText, fileName, buffer.length);
  }

  throw new FactCheckError(
    "Gemini free-tier quota is exhausted. Add GROQ_API_KEY from https://console.groq.com (free) to .env and restart the server.",
    429,
  );
}

function getErrorStatus(error) {
  if (error instanceof FactCheckError) {
    return error.statusCode;
  }

  return Number(error?.status ?? error?.statusCode);
}

async function runGeminiTextAnalysis(client, documentText, fileName, documentSizeBytes) {
  const extracted = await extractClaimsWithGemini(client, documentText);
  const runtimeClaimLimit = getRuntimeClaimLimit();
  const selectedClaims = extracted.claims.slice(0, runtimeClaimLimit);
  const verified = await verifyClaimsWithGemini(client, selectedClaims);
  const noteSuffix =
    selectedClaims.length < extracted.claims.length
      ? ` Vercel fast mode verified ${selectedClaims.length} of ${extracted.claims.length} extracted claims to stay within serverless execution limits.`
      : "";

  return buildFinalAnalysis({
    documentTitle: extracted.document_title,
    documentSummary: extracted.document_summary,
    extractedClaims: selectedClaims,
    verifiedClaims: verified,
    fileName,
    documentSizeBytes,
    extractionModel: ANALYSIS_MODEL,
    verificationModel: ANALYSIS_MODEL,
    note: `PDF text was read locally, then claims were extracted and verified with Gemini.${noteSuffix}`,
  });
}

async function runGroqTextAnalysis(groqApiKey, documentText, fileName, documentSizeBytes) {
  const extractionModel = getGroqExtractionModelName();
  const verificationModel = getGroqVerificationModelName();
  const extracted = await extractClaimsWithGroq(groqApiKey, documentText);
  const runtimeClaimLimit = getRuntimeClaimLimit();
  const selectedClaims = extracted.claims.slice(0, runtimeClaimLimit);
  const verified = await verifyClaimsWithGroq(groqApiKey, selectedClaims);
  const noteSuffix =
    selectedClaims.length < extracted.claims.length
      ? ` Vercel fast mode verified ${selectedClaims.length} of ${extracted.claims.length} extracted claims to stay within serverless execution limits.`
      : "";

  return buildFinalAnalysis({
    documentTitle: extracted.document_title,
    documentSummary: extracted.document_summary,
    extractedClaims: selectedClaims,
    verifiedClaims: verified,
    fileName,
    documentSizeBytes,
    extractionModel: `${extractionModel} (Groq)`,
    verificationModel: `${verificationModel} (Groq)`,
    note: `PDF text was read locally, then claims were extracted and verified with Groq.${noteSuffix}`,
  });
}

async function extractClaimsWithGemini(client, documentText) {
  const response = await withGeminiRetry(() =>
    client.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [buildExtractionInstructions().trim(), "", "--- DOCUMENT TEXT ---", documentText].join(
                "\n",
              ),
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }),
  );

  return parseModelJson(response, ExtractionOnlySchema, normalizeExtractionOnlyPayload);
}

async function extractClaimsWithGroq(groqApiKey, documentText) {
  // If the document is large, split into chunks to reduce per-request token usage
  const CHUNK_SIZE = 16000; // characters per chunk (approximate)
  function chunkText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.slice(i, i + size));
    }
    return chunks;
  }

  const chunks = chunkText(documentText, CHUNK_SIZE);
  let accumulatedClaims = [];
  let documentTitle = "Uploaded document";
  let documentSummary = "";

  for (let i = 0; i < chunks.length; i += 1) {
    const chunkPrompt = [
      buildExtractionInstructions().trim(),
      "",
      `--- DOCUMENT CHUNK ${i + 1} of ${chunks.length} ---`,
      chunks[i],
    ].join("\n");

    let responseText;
    try {
      responseText = await withGroqRetry(() =>
        generateGroqJson({
          apiKey: groqApiKey,
          systemPrompt: "You extract claims from documents. Respond with valid JSON only.",
          userPrompt: chunkPrompt,
          maxTokens: 8192,
          model: getGroqExtractionModelName(),
        }),
      );
    } catch {
      // skip failing chunk and continue
      continue;
    }

    try {
      const parsed = parseModelJson(
        { text: responseText },
        ExtractionOnlySchema,
        normalizeExtractionOnlyPayload,
      );

      if (parsed.document_title) documentTitle = parsed.document_title;
      if (parsed.document_summary) documentSummary = parsed.document_summary;

      for (const claim of parsed.claims) {
        if (!accumulatedClaims.some((c) => c.claim_text === claim.claim_text)) {
          accumulatedClaims.push(claim);
        }

        if (accumulatedClaims.length >= MAX_CLAIMS) break;
      }

      if (accumulatedClaims.length >= MAX_CLAIMS) break;
    } catch {
      // ignore parsing errors for this chunk
    }

    // small delay between chunk requests to help avoid burst TPM
    await delay(500);
  }

  if (accumulatedClaims.length === 0) {
    throw new FactCheckError("The model did not extract any claims from this PDF.", 502);
  }

  return {
    document_title: documentTitle,
    document_summary: documentSummary,
    claims: accumulatedClaims.slice(0, MAX_CLAIMS),
  };
}

async function verifyClaimsWithGemini(client, extractedClaims) {
  const today = new Date().toISOString().slice(0, 10);
  const claimsWithIds = tagClaimsWithIds(extractedClaims);
  const verifiedClaims = [];
  const verifyBatchSize = getVerifyBatchSize();
  const verificationDelayMs = getVerificationDelayMs();

  for (const chunk of chunkArray(claimsWithIds, verifyBatchSize)) {
    const response = await withGeminiRetry(() =>
      client.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  buildVerificationInstructions(today).trim(),
                  "",
                  "Verify these claims:",
                  JSON.stringify(chunk, null, 2),
                ].join("\n"),
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    );

    const parsed = parseModelJson(response, createVerificationBatchSchema(chunk.length), (raw) =>
      normalizeVerificationPayload(raw, chunk.length),
    );
    verifiedClaims.push(...parsed.claims);
    if (verificationDelayMs > 0) {
      await delay(verificationDelayMs);
    }
  }

  return verifiedClaims;
}

async function verifyClaimsWithGroq(groqApiKey, extractedClaims) {
  const today = new Date().toISOString().slice(0, 10);
  const claimsWithIds = tagClaimsWithIds(extractedClaims);
  const verifiedClaims = [];
  const verifyBatchSize = getVerifyBatchSize();
  const verificationDelayMs = getVerificationDelayMs();

  for (const chunk of chunkArray(claimsWithIds, verifyBatchSize)) {
    const responseText = await withGroqRetry(() =>
      generateGroqJson({
        apiKey: groqApiKey,
        systemPrompt: "You verify factual claims. Respond with valid JSON only.",
        userPrompt: [
          buildVerificationInstructions(today).trim(),
          "",
          "Verify these claims:",
          JSON.stringify(chunk, null, 2),
        ].join("\n"),
        maxTokens: 4096,
        model: GROQ_VERIFICATION_MODEL,
      }),
    );

    const parsed = parseModelJson(
      { text: responseText },
      createVerificationBatchSchema(chunk.length),
      (raw) => normalizeVerificationPayload(raw, chunk.length),
    );
    verifiedClaims.push(...parsed.claims);
    if (verificationDelayMs > 0) {
      await delay(verificationDelayMs);
    }
  }

  return verifiedClaims;
}

function tagClaimsWithIds(claims) {
  return claims.map((claim, index) => ({
    id: `C${index + 1}`,
    claim_text: cleanText(claim.claim_text),
    claim_type: claim.claim_type,
    page_reference: cleanText(claim.page_reference),
    evidence_snippet: cleanText(claim.evidence_snippet),
  }));
}

function mergeClaims(extractedClaims, verifiedClaims) {
  const verificationMap = new Map(
    verifiedClaims.map((claim) => [
      claim.claim_id,
      {
        verdict: claim.verdict,
        confidence: claim.confidence,
        explanation: cleanText(claim.explanation),
        corrected_fact: cleanText(claim.corrected_fact),
        reasoning_label: claim.reasoning_label,
        sources: claim.sources.map((source) => ({
          title: cleanText(source.title),
          url: cleanText(source.url),
          publisher: cleanText(source.publisher),
          domain: cleanText(source.domain),
        })),
      },
    ]),
  );

  return extractedClaims.map((claim) => {
    const verification = verificationMap.get(claim.id);

    if (!verification) {
      return {
        ...claim,
        verdict: "False",
        confidence: 35,
        explanation:
          "No verification record was returned for this claim. Re-run the analysis to confirm.",
        corrected_fact: "Could not verify in this run.",
        reasoning_label: "contradicted_or_unsupported",
        sources: [],
      };
    }

    return { ...claim, ...verification };
  });
}

function buildFinalAnalysis({
  documentTitle,
  documentSummary,
  extractedClaims,
  verifiedClaims,
  fileName,
  documentSizeBytes,
  extractionModel,
  verificationModel,
  note,
}) {
  const taggedClaims = tagClaimsWithIds(extractedClaims);
  const claims = mergeClaims(taggedClaims, verifiedClaims);
  const summary = buildSummary(claims);
  const highlights = claims
    .filter((claim) => claim.verdict !== "Verified")
    .slice(0, 5)
    .map((claim) => ({
      claim_id: claim.id,
      claim_text: claim.claim_text,
      corrected_fact: claim.corrected_fact,
    }));

  return {
    id: createAnalysisId(),
    createdAt: new Date().toISOString(),
    documentName: fileName,
    documentTitle,
    documentSummary,
    documentSizeBytes,
    summary,
    highlights,
    claims,
    demoFallback: false,
    models: {
      extraction: extractionModel,
      verification: verificationModel,
    },
    privacy: {
      filesStoredPermanently: false,
      note,
    },
  };
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function parseModelJson(response, schema, normalize) {
  const text = response.text?.trim();

  if (!text) {
    throw new FactCheckError("The model did not return a response for this PDF.", 502);
  }

  try {
    const raw = JSON.parse(stripJsonFences(text));
    const normalized = normalize ? normalize(raw) : raw;
    return schema.parse(normalized);
  } catch (error) {
    if (error instanceof FactCheckError) {
      throw error;
    }

    const message =
      error instanceof z.ZodError
        ? `Model JSON did not match the expected schema: ${error.issues[0]?.message || "invalid shape"}`
        : error instanceof Error
          ? error.message
          : "Invalid JSON from model.";

    throw new FactCheckError(message, 502);
  }
}

function stripJsonFences(text) {
  let trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return trimmed.slice(jsonStart, jsonEnd + 1);
  }

  return trimmed;
}

function buildSummary(claims) {
  const verdictCounts = claims.reduce(
    (accumulator, claim) => {
      accumulator.total += 1;
      accumulator[claim.verdict] += 1;
      return accumulator;
    },
    { total: 0, Verified: 0, Inaccurate: 0, False: 0 },
  );

  return {
    totalClaims: verdictCounts.total,
    verified: verdictCounts.Verified,
    inaccurate: verdictCounts.Inaccurate,
    false: verdictCounts.False,
    overallRisk:
      verdictCounts.False >= 3 || verdictCounts.Inaccurate + verdictCounts.False >= 6
        ? "high"
        : verdictCounts.False >= 1 || verdictCounts.Inaccurate >= 2
          ? "medium"
          : "low",
  };
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function createAnalysisId() {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function withGeminiRetry(operation) {
  const retryDelays = getGeminiRetryDelays();

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetryGeminiError(error) || attempt === retryDelays.length) {
        throw normalizeGeminiError(error);
      }

      const retryAfterMs = getGeminiRetryDelayMs(error) ?? retryDelays[attempt] ?? 90000;
      await delay(retryAfterMs);
    }
  }

  throw new FactCheckError("Gemini request failed after retrying.", 502);
}

function getGeminiRetryDelayMs(error) {
  const message = String(error?.message || error?.error?.message || "");
  const secondsMatch = message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);

  if (secondsMatch) {
    return Math.ceil(Number(secondsMatch[1]) * 1000) + 3000;
  }

  return undefined;
}

function normalizeGeminiError(error) {
  if (error instanceof FactCheckError) {
    return error;
  }

  const statusCode = Number(error?.status ?? error?.statusCode ?? error?.error?.code);
  const message = String(error?.message || error?.error?.message || "Gemini API request failed.");
  const normalizedMessage = message.toLowerCase();

  if (statusCode === 400 && normalizedMessage.includes("api key")) {
    return new FactCheckError(
      "Gemini API key is invalid. Create a key at https://aistudio.google.com/apikey and set GEMINI_API_KEY in .env.",
      401,
    );
  }

  if (statusCode === 429 || normalizedMessage.includes("resource_exhausted")) {
    const retryHint = getGeminiRetryDelayMs(error);
    const waitSeconds = retryHint ? Math.ceil(retryHint / 1000) : 90;

    return new FactCheckError(
      `Gemini free-tier rate limit reached. Wait about ${waitSeconds} seconds and retry, or add GROQ_API_KEY from https://console.groq.com (free) to .env for automatic fallback.`,
      429,
    );
  }

  if (statusCode === 403) {
    return new FactCheckError(
      "Gemini API access denied for this key or region. Check AI Studio permissions and try again.",
      403,
    );
  }

  return error instanceof Error ? error : new Error(message);
}

function shouldRetryGeminiError(error) {
  const statusCode = Number(error?.status ?? error?.statusCode);
  const message = String(error?.message || "").toLowerCase();

  if (statusCode === 429 || message.includes("resource_exhausted")) {
    return false;
  }

  return Number.isInteger(statusCode) && statusCode >= 500 && statusCode <= 599;
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function withGroqRetry(operation) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = Number(error?.status);
      const message = String(error?.message || "").toLowerCase();
      const isRateLimited = status === 429 || message.includes("rate limit");

      if (!isRateLimited || attempt === 3) {
        throw error;
      }

      const waitMs = getGroqRetryDelayMs(error) ?? 30000;
      await delay(waitMs);
    }
  }

  throw new FactCheckError("Groq request failed after retrying.", 502);
}

function getGroqRetryDelayMs(error) {
  const message = String(error?.message || "");
  const secondsMatch = message.match(/try again in (\d+(?:\.\d+)?)\s*s/i);

  if (secondsMatch) {
    return Math.ceil(Number(secondsMatch[1]) * 1000) + 2000;
  }

  return undefined;
}
