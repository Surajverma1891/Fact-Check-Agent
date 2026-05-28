# FactCheck Agent

FactCheck Agent is a full-stack PDF fact-checking web app built for assignment-style “trap documents.” A user uploads a PDF, the app extracts high-risk factual claims, verifies them against live web sources, and returns a report that labels each claim as `Verified`, `Inaccurate`, or `False`.

## What it does

- Upload and preview PDF files in the browser
- Extract fact-checkable claims from the document
- Search the live web for current evidence
- Return corrected facts, confidence scores, and source links
- Export the final report as CSV or JSON
- Keep local report history in the browser
- Provide a built-in demo report for walkthroughs when no API key is configured

## Stack

- Frontend: React 19 + Vite
- Backend: Express 5 + Multer
- AI + live web verification: OpenAI Responses API with `input_file`, structured outputs, and `web_search`
- PDF preview metadata: `pdfjs-dist`

## Project structure

```text
src/
  components/        UI primitives
  lib/               demo data, exports, browser history storage
  pages/             Home, Upload, Processing, Dashboard, History, About
server/
  fact-check-service.js   Claim extraction + live verification pipeline
  index.js                Express API + static asset server
render.yaml               Render deployment template
```

## Environment variables

Create a `.env` file from `.env.example`:

```bash
OPENAI_API_KEY=your_openai_api_key
PORT=8787
```

Local development note:

- `npm run dev` and `npm start` now auto-load `.env`
- if `OPENAI_API_KEY` is missing, PDF analysis will pause with the same error you saw

If `OPENAI_API_KEY` is not present on the server, the upload screen also supports an optional temporary session key field.

## Local development

```bash
npm install
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Express API on `http://localhost:8787`

For a production-style local run:

```bash
npm run build
npm start
```

Then open `http://localhost:8787`.

## API behavior

`POST /api/fact-check`

- Accepts one uploaded PDF under 20 MB
- Sends the PDF to OpenAI as `user_data`
- Extracts up to 12 high-value factual claims
- Verifies claims in batches with live web search
- Deletes the uploaded OpenAI file after extraction
- Returns a structured JSON analysis object used by the dashboard

## Deployment

Live deployment:

- Vercel: `https://fact-check-agent-eta.vercel.app`

This repo is configured for both:

- Vercel using `vercel.json` + `api/**`
- Render using the included `render.yaml`

### Vercel steps

1. Run `vercel`.
2. Set `OPENAI_API_KEY` in the Vercel project environment variables.
3. Redeploy or promote the latest deployment.
4. Test `https://your-domain/api/health`.

### Render steps

1. Push this project to GitHub.
2. Create a new Render Web Service from the repo.
3. Set `OPENAI_API_KEY` in Render environment variables.
4. Use the generated settings from `render.yaml`:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
5. Deploy and test `/api/health`.

## Demo mode

The app ships with a static demo analysis so you can:

- show the UI without using API credits
- record a quick walkthrough
- validate export and history flows before wiring secrets

Open it directly from the home page or at:

```text
/dashboard/demo-analysis
```

## Verification notes

- The UI, routes, and demo report were smoke-tested locally.
- Live PDF analysis requires a valid OpenAI API key at runtime.
- The current build passes:

```bash
npm run lint
npm run build
```

## Assignment handoff

Use [SUBMISSION.md](./SUBMISSION.md) as the final delivery template for:

- deployed app link
- GitHub repository link
- demo video link
