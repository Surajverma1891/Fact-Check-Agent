import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCheckCircle,
  FaFileAlt,
  FaGlobe,
  FaRegClone,
  FaSearch,
} from "react-icons/fa";

import { DEMO_ANALYSIS } from "../lib/demo-analysis";

const capabilityCards = [
  {
    icon: <FaFileAlt />,
    title: "Extract",
    body: "Pull out checkable numbers, dates, percentages, and product claims from your PDF.",
  },
  {
    icon: <FaGlobe />,
    title: "Verify",
    body: "Cross-check each claim against live web sources instead of stale internal decks.",
  },
  {
    icon: <FaCheckCircle />,
    title: "Report",
    body: "Get verdicts, corrections, source links, and confidence scores in one table.",
  },
];

function Home() {
  const navigate = useNavigate();

  return (
    <section className="page page--home">
      <div className="hero">
        <div className="hero__copy card card--glass">
          <span className="eyebrow">Assignment-ready fact-checking workflow</span>
          <h1>Automated PDF fact-checking for content that has to survive scrutiny.</h1>
          <p className="lede">
            Upload a marketing PDF, extract risky claims, search the live web, and
            produce a truth report with verified facts and corrections.
          </p>

          <div className="hero__actions">
            <button className="button button--primary" onClick={() => navigate("/upload")}>
              Upload a PDF
              <FaArrowRight />
            </button>
            <button
              className="button button--secondary"
              onClick={() => navigate(`/dashboard/${DEMO_ANALYSIS.id}`)}
            >
              Open demo report
            </button>
          </div>

          <div className="hero__trust">
            <span>Live web verification</span>
            <span>Claim-level verdicts</span>
            <span>CSV and JSON export</span>
          </div>
        </div>

        <div className="hero__visual card">
          <div className="hero-panel__header">
            <span className="pill">Truth Layer</span>
            <span className="hero-panel__label">How the pipeline works</span>
          </div>

          <div className="workflow">
            <div className="workflow__step workflow__step--purple">
              <FaRegClone />
              <div>
                <strong>1. Extract claims</strong>
                <p>Numbers, dates, and factual assertions are isolated from the PDF.</p>
              </div>
            </div>

            <div className="workflow__step workflow__step--blue">
              <FaSearch />
              <div>
                <strong>2. Search the web</strong>
                <p>Each claim is checked against fresh public sources in real time.</p>
              </div>
            </div>

            <div className="workflow__step workflow__step--green">
              <FaCheckCircle />
              <div>
                <strong>3. Return verdicts</strong>
                <p>Verified, Inaccurate, or False, with the corrected fact when needed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-grid">
        {capabilityCards.map((item) => (
          <article className="feature-card card" key={item.title}>
            <div className="feature-card__icon">{item.icon}</div>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <div className="info-grid">
        <article className="card">
          <span className="eyebrow">Why teams use it</span>
          <h2>Built for trap documents and stale marketing stats.</h2>
          <ul className="bullet-list">
            <li>Flags outdated market numbers before they hit a client deck.</li>
            <li>Turns unsupported product claims into a review queue.</li>
            <li>Keeps sources clickable so the report is actually defensible.</li>
          </ul>
        </article>

        <article className="card card--accent">
          <span className="eyebrow">Demo mode</span>
          <h2>No API key yet? You can still review the final report experience.</h2>
          <p>
            The bundled demo report shows the full verdict table, correction cards, and
            source view so you can record a walkthrough immediately.
          </p>
          <button
            className="button button--secondary"
            onClick={() => navigate(`/dashboard/${DEMO_ANALYSIS.id}`)}
          >
            View demo analysis
          </button>
        </article>
      </div>
    </section>
  );
}

export default Home;
