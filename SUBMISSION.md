# FactCheck Agent Submission

## Deployed App Link

`https://fact-check-agent-eta.vercel.app`

## GitHub Repository

Pending push from local workspace. Add your repository URL here after pushing:

`https://github.com/your-username/fact-check-agent`

## Demo Video

Pending recording. Add your 30-second screen recording link here:

`https://drive.google.com/...`

## Suggested 30-second demo flow

1. Open the landing page.
2. Show the upload screen and optional session API key field.
3. Upload a PDF and start analysis, or open the built-in demo report if credits are unavailable.
4. Show the verdict table and one detailed corrected fact with source links.
5. Click `Export CSV` to show the submission-ready report output.

## Deployment checklist

- [ ] Push this folder to GitHub
- [ ] Set `OPENAI_API_KEY` on Vercel so evaluators can upload PDFs without entering a session key
- [ ] Confirm `https://fact-check-agent-eta.vercel.app/api/health` returns `ok: true`
- [ ] Record the final 30-second walkthrough
