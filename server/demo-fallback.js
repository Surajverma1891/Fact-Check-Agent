import { DEMO_ANALYSIS } from "../src/lib/demo-analysis.js";

export function buildDemoFallbackAnalysis(fileName, documentSizeBytes) {
  return {
    ...structuredClone(DEMO_ANALYSIS),
    id: `analysis-demo-${Date.now()}`,
    createdAt: new Date().toISOString(),
    documentName: fileName || DEMO_ANALYSIS.documentName,
    documentTitle: `Sample fact-check report`,
    documentSizeBytes: documentSizeBytes || DEMO_ANALYSIS.documentSizeBytes,
    documentSummary:
      "Gemini free-tier quota is exhausted, so a bundled sample trap-document report was loaded. It demonstrates verified, inaccurate, and false claims in the dashboard. For live PDF analysis, wait 24 hours, use a new Gemini key, or click “Run demo report (no API)” on upload.",
    demoFallback: true,
    models: {
      extraction: "demo-fallback",
      verification: "demo-fallback",
    },
    privacy: {
      filesStoredPermanently: false,
      note: "No live Gemini analysis ran for this upload. Sample data is shown so reviewers can still test the UI.",
    },
  };
}
