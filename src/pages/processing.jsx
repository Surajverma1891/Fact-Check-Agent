import { startTransition, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaGlobe, FaListUl, FaRobot } from "react-icons/fa";

import { saveAnalysis } from "../lib/analysis-store";

const steps = [
  {
    title: "Extracting claims",
    icon: <FaListUl />,
    body: "Reading the PDF and isolating numbers, dates, and technical assertions.",
  },
  {
    title: "Searching the web",
    icon: <FaGlobe />,
    body: "Looking for current evidence and primary sources for each extracted claim.",
  },
  {
    title: "Verifying verdicts",
    icon: <FaRobot />,
    body: "Classifying each claim as Verified, Inaccurate, or False with confidence scores.",
  },
  {
    title: "Generating report",
    icon: <FaCheckCircle />,
    body: "Packaging the corrected facts, source links, and report summary.",
  },
];

const inFlightAnalyses = new Map();

function createAnalysisRequestKey(file, apiKey) {
  return [
    file.name,
    file.size,
    file.lastModified,
    apiKey ? "session-key" : "server-key",
  ].join(":");
}

async function requestAnalysis({ file, apiKey, useDemo }) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  if (apiKey) {
    headers["x-session-gemini-key"] = apiKey;
  }
  if (useDemo) {
    headers["x-demo-mode"] = "true";
  }
  if (window.location.hostname.endsWith(".vercel.app")) {
    headers["x-debug"] = "true";
  }

  const response = await fetch("/api/fact-check", {
    method: "POST",
    body: formData,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = [payload.error || "Analysis failed."];
    if (payload.stack) {
      details.push(payload.stack);
    }
    throw new Error(details.join("\n\n"));
  }

  return payload.analysis;
}

function getAnalysisPromise({ file, apiKey, useDemo }) {
  const requestKey = [createAnalysisRequestKey(file, apiKey), useDemo ? "demo" : "live"].join(":");
  const activeRequest = inFlightAnalyses.get(requestKey);

  if (activeRequest) {
    return activeRequest;
  }

  const requestPromise = requestAnalysis({ file, apiKey, useDemo }).finally(() => {
    inFlightAnalyses.delete(requestKey);
  });

  inFlightAnalyses.set(requestKey, requestPromise);
  return requestPromise;
}

function Processing() {
  const location = useLocation();
  const navigate = useNavigate();
  const file = location.state?.file || null;
  const apiKey = location.state?.apiKey || "";
  const useDemo = Boolean(location.state?.useDemo);
  const [progress, setProgress] = useState(8);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [statusNote, setStatusNote] = useState(
    useDemo ? "Loading demo fact-check report (no API)..." : "Uploading PDF and extracting claims...",
  );

  useEffect(() => {
    if (!file) {
      navigate("/upload", { replace: true });
      return undefined;
    }

    let isActive = true;
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return current;
        }

        const next = current + Math.max(2, (94 - current) / 6);

        if (next >= 70) {
          setStatusNote(
            "Verifying claims with live web search — this can take 2–5 minutes. Please keep this tab open.",
          );
        } else if (next >= 35) {
          setStatusNote("Searching the web for evidence on each claim...");
        }

        return next;
      });
    }, 700);

    getAnalysisPromise({ file, apiKey, useDemo })
      .then((analysis) => {
        if (!isActive) {
          return;
        }

        window.clearInterval(progressTimer);
        setProgress(100);
        saveAnalysis(analysis);

        startTransition(() => {
          navigate(`/dashboard/${analysis.id}`, {
            replace: true,
            state: { demoFallback: Boolean(analysis.demoFallback) },
          });
        });
      })
      .catch((analysisError) => {
        if (!isActive) {
          return;
        }

        window.clearInterval(progressTimer);
        setError(analysisError.message || "Analysis failed.");
      });

    return () => {
      isActive = false;
      window.clearInterval(progressTimer);
    };
  }, [apiKey, attempt, file, navigate, useDemo]);

  function retryAnalysis() {
    setError("");
    setProgress(8);
    setAttempt((current) => current + 1);
  }

  const activeStepIndex = progress < 28 ? 0 : progress < 56 ? 1 : progress < 84 ? 2 : 3;

  return (
    <section className="page page--processing">
      <div className="processing-card card">
        <div className="page-header page-header--compact">
          <div>
            <span className="eyebrow">Analysis in progress</span>
            <h1>Fact-checking {file?.name}</h1>
          </div>
          <span className="pill">{Math.round(progress)}%</span>
        </div>

        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="processing-steps">
          {steps.map((step, index) => (
            <article
              className={`processing-step ${index <= activeStepIndex ? "processing-step--active" : ""}`}
              key={step.title}
            >
              <div className="processing-step__icon">{step.icon}</div>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>

        {error ? (
          <div className="error-panel">
            <FaExclamationTriangle />
            <div>
              <strong>Analysis paused</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <div className="card processing-note">
            <strong>What is happening right now?</strong>
            <p>{statusNote}</p>
            <ul className="bullet-list">
              <li>The PDF is being scanned for factual claims worth verifying.</li>
              <li>Each claim is being checked against live web sources.</li>
              <li>Progress may pause near 92% while verification finishes — that is normal.</li>
            </ul>
          </div>
        )}

        <div className="processing-actions">
          {error ? (
            <button
              className="button button--primary"
              onClick={retryAnalysis}
            >
              Retry analysis
            </button>
          ) : null}
          <button className="button button--secondary" onClick={() => navigate("/upload")}>
            Back to upload
          </button>
        </div>
      </div>
    </section>
  );
}

export default Processing;
