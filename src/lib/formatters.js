import Papa from "papaparse";

export function formatBytes(bytes = 0) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDateTime(isoString) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function downloadAnalysisCsv(analysis) {
  const rows = analysis.claims.map((claim) => ({
    id: claim.id,
    verdict: claim.verdict,
    confidence: claim.confidence,
    claim: claim.claim_text,
    corrected_fact: claim.corrected_fact,
    page_reference: claim.page_reference,
    source_count: claim.sources.length,
    sources: claim.sources.map((source) => source.url).join(" | "),
  }));

  const csv = Papa.unparse(rows);
  downloadBlob(csv, "text/csv;charset=utf-8", `${slugify(analysis.documentName)}-fact-check.csv`);
}

export function downloadAnalysisJson(analysis) {
  const serialized = JSON.stringify(analysis, null, 2);
  downloadBlob(
    serialized,
    "application/json;charset=utf-8",
    `${slugify(analysis.documentName)}-fact-check.json`,
  );
}

function downloadBlob(content, mimeType, fileName) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function slugify(value = "analysis") {
  return value
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
