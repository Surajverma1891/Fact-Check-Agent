import { useDeferredValue, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaFileExport, FaSearch } from "react-icons/fa";

import MetricCard from "../components/metric-card";
import StatusBadge from "../components/status-badge";
import { getAnalysis, getLatestAnalysis } from "../lib/analysis-store";
import { DEMO_ANALYSIS } from "../lib/demo-analysis";
import {
  downloadAnalysisCsv,
  downloadAnalysisJson,
  formatBytes,
  formatDateTime,
} from "../lib/formatters";

const filterOptions = ["All", "Verified", "Inaccurate", "False"];

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { analysisId } = useParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const analysis = resolveAnalysis(analysisId);

  const filteredClaims = (analysis?.claims || []).filter((claim) => {
    const matchesFilter = filter === "All" || claim.verdict === filter;
    const haystack = `${claim.claim_text} ${claim.corrected_fact} ${claim.page_reference}`.toLowerCase();
    const matchesQuery = !deferredQuery || haystack.includes(deferredQuery);
    return matchesFilter && matchesQuery;
  });

  const activeClaimId = filteredClaims.some((claim) => claim.id === selectedClaimId)
    ? selectedClaimId
    : (filteredClaims[0]?.id ?? "");

  const selectedClaim =
    analysis?.claims.find((claim) => claim.id === activeClaimId) || filteredClaims[0] || null;

  if (!analysis) {
    return (
      <section className="page">
        <article className="card empty-state">
          <h1>No analysis found yet.</h1>
          <p>Upload a PDF or open the bundled demo report to inspect the interface.</p>
          <div className="hero__actions">
            <button className="button button--primary" onClick={() => navigate("/upload")}>
              Upload PDF
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate(`/dashboard/${DEMO_ANALYSIS.id}`)}
            >
              Open demo report
            </button>
          </div>
        </article>
      </section>
    );
  }

  const showDemoBanner = Boolean(analysis.demoFallback || location.state?.demoFallback);

  return (
    <section className="page page--dashboard">
      {showDemoBanner ? (
        <article className="card processing-note">
          <strong>Demo report loaded</strong>
          <p>
            Gemini free-tier quota was exhausted, so a sample trap-document report is shown. Judges can
            still review verified / inaccurate / false claims. For live PDF analysis, wait 24 hours or
            create a new API key at{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Google AI Studio
            </a>
            .
          </p>
        </article>
      ) : null}

      <div className="page-header">
        <div>
          <button className="text-button" onClick={() => navigate("/upload")}>
            <FaArrowLeft />
            Analyze another document
          </button>
          <h1>{analysis.documentTitle || analysis.documentName}</h1>
          <p className="lede">
            Reviewed on {formatDateTime(analysis.createdAt)} | {analysis.summary.totalClaims} claims
            extracted | {formatBytes(analysis.documentSizeBytes)}
          </p>
        </div>

        <div className="page-actions">
          <button className="button button--secondary" onClick={() => downloadAnalysisJson(analysis)}>
            <FaFileExport />
            Export JSON
          </button>
          <button className="button button--primary" onClick={() => downloadAnalysisCsv(analysis)}>
            <FaDownload />
            Export CSV
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Verified"
          value={analysis.summary.verified}
          helper="Aligned with reliable current sources"
          tone="positive"
        />
        <MetricCard
          label="Inaccurate"
          value={analysis.summary.inaccurate}
          helper="Close to true, but outdated or numerically wrong"
          tone="warning"
        />
        <MetricCard
          label="False"
          value={analysis.summary.false}
          helper="Contradicted or unsupported"
          tone="danger"
        />
        <MetricCard
          label="Risk level"
          value={analysis.summary.overallRisk.toUpperCase()}
          helper="Document-level quality signal"
          tone="neutral"
        />
      </div>

      <div className="insight-grid">
        <article className="card">
          <span className="eyebrow">Document summary</span>
          <p>{analysis.documentSummary}</p>
        </article>

        <article className="card">
          <span className="eyebrow">Top corrections</span>
          <ul className="bullet-list">
            {(analysis.highlights || []).map((item) => (
              <li key={item.claim_id}>{item.corrected_fact}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="card">
          <div className="results-toolbar">
            <div className="search-field">
              <FaSearch />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search claims, corrections, or page references"
              />
            </div>

            <div className="filter-row">
              {filterOptions.map((option) => (
                <button
                  className={`filter-chip ${filter === option ? "filter-chip--active" : ""}`}
                  key={option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="table-shell">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Claim</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Sources</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim, index) => (
                  <tr
                    className={claim.id === selectedClaim?.id ? "is-selected" : ""}
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <strong>{claim.claim_text}</strong>
                      <span>{claim.page_reference}</span>
                    </td>
                    <td>
                      <StatusBadge status={claim.verdict} />
                    </td>
                    <td>{claim.confidence}%</td>
                    <td>{claim.sources.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="card detail-panel">
          {selectedClaim ? (
            <>
              <div className="detail-panel__header">
                <div>
                  <span className="eyebrow">{selectedClaim.id}</span>
                  <h2>{selectedClaim.claim_text}</h2>
                </div>
                <StatusBadge status={selectedClaim.verdict} />
              </div>

              <div className="confidence-meter" aria-hidden="true">
                <span style={{ width: `${selectedClaim.confidence}%` }} />
              </div>
              <p className="confidence-label">Confidence {selectedClaim.confidence}%</p>

              <div className="detail-block">
                <h3>Why this verdict?</h3>
                <p>{selectedClaim.explanation}</p>
              </div>

              <div className="detail-block detail-block--accent">
                <h3>Correct information</h3>
                <p>{selectedClaim.corrected_fact}</p>
              </div>

              <div className="detail-block">
                <h3>Document evidence</h3>
                <p>{selectedClaim.evidence_snippet}</p>
                <span className="detail-meta">{selectedClaim.page_reference}</span>
              </div>

              <div className="detail-block">
                <h3>Sources</h3>
                <div className="source-list">
                  {selectedClaim.sources.map((source) => (
                    <a
                      className="source-card"
                      href={source.url}
                      key={`${selectedClaim.id}-${source.url}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <strong>{source.title}</strong>
                      <span>{source.publisher}</span>
                      <small>{source.domain}</small>
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="preview-empty">
              <p>Select a claim to inspect its evidence and corrected fact.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function resolveAnalysis(analysisId) {
  if (analysisId === DEMO_ANALYSIS.id) {
    return DEMO_ANALYSIS;
  }

  if (analysisId) {
    return getAnalysis(analysisId);
  }

  return getLatestAnalysis() || DEMO_ANALYSIS;
}

export default Dashboard;
