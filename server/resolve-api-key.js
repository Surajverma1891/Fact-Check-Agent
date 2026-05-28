export function resolveGeminiApiKey(request) {
  const sessionKey =
    request.get("x-session-gemini-key")?.trim() || request.get("x-session-openai-key")?.trim();

  return sessionKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || "";
}

export function resolveGroqApiKey(request) {
  return request.get("x-session-groq-key")?.trim() || process.env.GROQ_API_KEY || "";
}
