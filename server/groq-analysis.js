export const GROQ_EXTRACTION_MODEL = "llama-3.3-70b-versatile";
export const GROQ_VERIFICATION_MODEL = "llama-3.1-8b-instant";

export async function generateGroqJson({
  apiKey,
  systemPrompt,
  userPrompt,
  maxTokens = 8192,
  model = GROQ_EXTRACTION_MODEL,
}) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message || `Groq API request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const text = payload?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Groq did not return a response.");
  }

  return text;
}

export function getGroqExtractionModelName() {
  return GROQ_EXTRACTION_MODEL;
}

export function getGroqVerificationModelName() {
  return GROQ_VERIFICATION_MODEL;
}
