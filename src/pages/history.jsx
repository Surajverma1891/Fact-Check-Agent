import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaClock, FaSearch } from "react-icons/fa";

import { listAnalyses } from "../lib/analysis-store";
import { DEMO_ANALYSIS } from "../lib/demo-analysis";
import { formatDateTime } from "../lib/formatters";

function History() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const analyses = listAnalyses();

  const filteredAnalyses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return analyses;
    }

    return analyses.filter((analysis) => {
      const haystack = `${analysis.documentTitle} ${analysis.documentName}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [analyses, query]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Local browser history</span>
          <h1>Past analyses and reusable demo report</h1>
        </div>
        <button className="button button--primary" onClick={() => navigate("/upload")}>
          Analyze new PDF
        </button>
      </div>

      <div className="info-grid">
        <article className="card">
          <span className="eyebrow">Bundled demo</span>
          <h2>Need a quick walkthrough?</h2>
          <p>The demo report ships with the app, so you always have a clean result screen to show.</p>
          <button
            className="button button--secondary"
            onClick={() => navigate(`/dashboard/${DEMO_ANALYSIS.id}`)}
          >
            Open demo analysis
          </button>
        </article>

        <article className="card">
          <span className="eyebrow">Stored locally</span>
          <h2>Your past reports stay in this browser only.</h2>
          <p>
            Uploaded files are not kept here, but the verdict summaries and source links are
            cached in local storage so you can reopen them later.
          </p>
        </article>
      </div>

      <article className="card">
        <div className="results-toolbar">
          <div className="search-field">
            <FaSearch />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search past document names"
            />
          </div>
        </div>

        {filteredAnalyses.length ? (
          <div className="history-list">
            {filteredAnalyses.map((analysis) => (
              <button
                className="history-card"
                key={analysis.id}
                onClick={() => navigate(`/dashboard/${analysis.id}`)}
              >
                <div>
                  <strong>{analysis.documentTitle || analysis.documentName}</strong>
                  <span>{analysis.documentName}</span>
                </div>
                <div className="history-card__meta">
                  <span>
                    <FaClock />
                    {formatDateTime(analysis.createdAt)}
                  </span>
                  <span>
                    {analysis.summary.verified} verified · {analysis.summary.inaccurate} inaccurate ·{" "}
                    {analysis.summary.false} false
                  </span>
                </div>
                <FaArrowRight />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--compact">
            <p>No local analysis history yet. Upload a PDF to create your first report.</p>
          </div>
        )}
      </article>
    </section>
  );
}

export default History;
