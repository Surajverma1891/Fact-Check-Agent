const STORAGE_KEY = "fact-check-agent-history-v1";
const MAX_ANALYSES = 12;

export function listAnalyses() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(analysis) {
  const deduped = listAnalyses().filter((item) => item.id !== analysis.id);
  const nextValue = [analysis, ...deduped].slice(0, MAX_ANALYSES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
}

export function getAnalysis(analysisId) {
  return listAnalyses().find((analysis) => analysis.id === analysisId) || null;
}

export function getLatestAnalysis() {
  return listAnalyses()[0] || null;
}
