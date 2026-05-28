import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCloudUploadAlt,
  FaFilePdf,
  FaKey,
  FaLock,
  FaRegCheckCircle,
} from "react-icons/fa";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf.mjs";

import { DEMO_ANALYSIS } from "../lib/demo-analysis";
import { formatBytes } from "../lib/formatters";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function Upload() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [isInspectingPdf, setIsInspectingPdf] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    let isActive = true;

    async function inspectPdf() {
      if (!file) {
        return;
      }

      setIsInspectingPdf(true);

      try {
        const pdf = await getDocument({ data: await file.arrayBuffer() }).promise;
        if (isActive) {
          setPageCount(pdf.numPages);
        }
        pdf.cleanup();
      } catch {
        if (isActive) {
          setPageCount(null);
        }
      } finally {
        if (isActive) {
          setIsInspectingPdf(false);
        }
      }
    }

    inspectPdf();

    return () => {
      isActive = false;
    };
  }, [file]);

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function selectFile(nextFile) {
    if (!nextFile) {
      return;
    }

    if (
      nextFile.type !== "application/pdf" &&
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are supported for analysis.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setError("Please upload a PDF under 20 MB.");
      return;
    }

    setError("");
    setPageCount(null);
    setFile(nextFile);
  }

  function handleFileInput(event) {
    selectFile(event.target.files?.[0] || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0] || null);
  }

  function startDemoAnalysis() {
    navigate("/processing", {
      state: {
        file: file || new File(["demo"], "Demo_Trap_Document.pdf", { type: "application/pdf" }),
        apiKey: "",
        useDemo: true,
      },
    });
  }

  function startAnalysis() {
    if (!file) {
      setError("Choose a PDF before continuing.");
      setIsStartingAnalysis(false);
      return;
    }

    if (isStartingAnalysis) {
      return;
    }

    setIsStartingAnalysis(true);

    navigate("/processing", {
      state: {
        file,
        apiKey: apiKey.trim(),
      },
    });
  }

  const previewPages = Array.from(
    { length: Math.min(pageCount || 4, 4) },
    (_, index) => index + 1,
  );

  return (
    <section className="page page--upload">
      <div className="page-header">
        <div>
          <span className="eyebrow">Upload document</span>
          <h1>Drop in a PDF and launch the fact-check run.</h1>
        </div>
        <button
          className="button button--secondary"
          onClick={() => navigate(`/dashboard/${DEMO_ANALYSIS.id}`)}
        >
          Demo report
        </button>
      </div>

      <div className="upload-layout">
        <article className="card upload-card">
          <div
            className={`dropzone ${isDragging ? "dropzone--active" : ""}`}
            onClick={handleBrowseClick}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
            />
            <div className="dropzone__icon">
              <FaCloudUploadAlt />
            </div>
            <h2>Upload your PDF document</h2>
            <p>Drag and drop here, or click to browse. Files up to 20 MB.</p>
            <button className="button button--primary" type="button">
              Choose PDF
            </button>
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="upload-card__notes">
            <div className="note-card">
              <FaLock />
              <div>
                <strong>Ephemeral processing</strong>
                <p>
                  Your file is sent only for analysis. The extracted report is saved locally in
                  your browser history.
                </p>
              </div>
            </div>

            <label className="session-key">
              <span>
                <FaKey />
                Optional session Gemini API key
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="GEMINI_API_KEY — add GROQ_API_KEY in .env if Gemini quota is exhausted"
              />
            </label>
          </div>
        </article>

        <article className="card preview-card">
          <div className="preview-card__header">
            <div>
              <span className="eyebrow">Selected file</span>
              <h2>{file ? file.name : "No PDF selected yet"}</h2>
            </div>
            {file ? (
              <span className="file-chip">
                <FaRegCheckCircle />
                Ready
              </span>
            ) : null}
          </div>

          {file ? (
            <>
              <div className="file-meta">
                <span>
                  <FaFilePdf />
                  {formatBytes(file.size)}
                </span>
                <span>{isInspectingPdf ? "Reading pages..." : `${pageCount || "?"} pages`}</span>
              </div>

              <div className="preview-strip">
                {previewPages.map((pageNumber) => (
                  <div className="preview-strip__page" key={pageNumber}>
                    <span className="preview-strip__paper" />
                    <strong>{pageNumber}</strong>
                    <small>Page</small>
                  </div>
                ))}
                {pageCount && pageCount > previewPages.length ? (
                  <div className="preview-strip__page preview-strip__page--more">
                    <strong>+{pageCount - previewPages.length}</strong>
                    <small>pages</small>
                  </div>
                ) : null}
              </div>

              <div className="preview-embed">
                <iframe src={previewUrl} title="PDF preview" />
              </div>
            </>
          ) : (
            <div className="preview-empty">
              <FaFilePdf />
              <p>Your selected PDF will appear here with page count and preview.</p>
            </div>
          )}

          <div className="preview-card__footer">
            <button
              className="button button--primary"
              onClick={startAnalysis}
              disabled={!file || isStartingAnalysis}
            >
              {isStartingAnalysis ? "Starting analysis..." : "Analyze document"}
            </button>
            <button className="button button--secondary" onClick={startDemoAnalysis} type="button">
              Run demo report (no API)
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export default Upload;
