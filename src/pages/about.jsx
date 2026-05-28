import { FaCheckCircle, FaFileAlt, FaGlobe, FaShieldAlt } from "react-icons/fa";

const processSteps = [
  {
    icon: <FaFileAlt />,
    title: "1. Extract",
    body: "The server reads the PDF and isolates the claims most likely to contain risky stats, dates, and market assertions.",
  },
  {
    icon: <FaGlobe />,
    title: "2. Search",
    body: "Each claim is checked against fresh public sources using live web search rather than stale cached copy.",
  },
  {
    icon: <FaCheckCircle />,
    title: "3. Verify",
    body: "Claims are classified as Verified, Inaccurate, or False, and corrected facts are attached when needed.",
  },
  {
    icon: <FaShieldAlt />,
    title: "4. Report",
    body: "The result screen keeps verdicts, source links, confidence, and exports together so the output is review-ready.",
  },
];

function About() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">About the system</span>
          <h1>How FactCheck Agent is designed to catch trap documents.</h1>
        </div>
      </div>

      <div className="section-grid">
        {processSteps.map((step) => (
          <article className="feature-card card" key={step.title}>
            <div className="feature-card__icon">{step.icon}</div>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </div>

      <div className="info-grid">
        <article className="card">
          <span className="eyebrow">What counts as a claim?</span>
          <ul className="bullet-list">
            <li>Market size estimates, growth rates, percentages, and population figures.</li>
            <li>Launch dates, founding years, roadmap promises, and technical capability statements.</li>
            <li>Any sentence that a reviewer could reasonably verify using public sources.</li>
          </ul>
        </article>

        <article className="card">
          <span className="eyebrow">Why it works well for marketing PDFs</span>
          <ul className="bullet-list">
            <li>It focuses the model on checkable facts instead of summarizing the entire document.</li>
            <li>It keeps verdicts structured so export, QA, and demos are consistent.</li>
            <li>It surfaces corrected facts, not just red flags, which makes revision faster.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export default About;
