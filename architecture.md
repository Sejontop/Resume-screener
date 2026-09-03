# BestFit.ai — Resume Screener

AI-powered recruitment screening system that evaluates candidate resumes against recruiter-defined job requirements and produces recruiter-only fit scores, summaries, and skill gaps.

---

## 1. High-Level Architecture Flow
[ Candidate Portal (/) ]│  (POST /api/apply)▼[ Next.js Serverless Route ] ──► [ Mammoth .docx Parser ] ──► (Plain Text Extraction)│├──► Fetch JD from Supabase ('jobs' table)├──► Apply Context Guardrails (JD ≤ 4k chars, Resume ≤ 7k chars)│▼[ Groq LPU Inference Cloud ] (openai/gpt-oss-120b)│  (Enforced JSON Mode Evaluation)▼[ Persist to Supabase ] ──► 'applications' table (llm_score, llm_summary, llm_gaps)│├──► Candidate Response: { "success": true }  <-- Internal metrics stripped│▼[ Recruiter Console (/admin) ] ──► Authenticated via 2h Inactivity Lease│  (GET /api/admin/jobs/:id/applications)▼[ Ranked Applicant Stack ] ──► Filter by Tier (80+ / 50–79 / <50)
---

## 2. Ingestion & Evaluation Pipelines

### Candidate Flow
1. **Selection & Ingestion:** Candidate selects an active role on `/`, fills contact parameters, and uploads a `.docx` resume.
2. **Buffer Processing:** `POST /api/apply` accepts the multipart payload and invokes `mammoth.extractRawText` to convert the binary buffer into clean plain text.
3. **Database Look-up:** Server fetches the relational Job Description from Supabase.
4. **Context Windowing:** Text lengths are sanitized and clamped:
   * **Job Description:** $\le$ 4,000 characters
   * **Resume Text:** $\le$ 7,000 characters
5. **LLM Evaluation:** Payload is dispatched to Groq (`openai/gpt-oss-120b`) enforcing JSON mode.
6. **Persistence:** Evaluation payload (`score`, `summary`, `gaps`) is written into the `applications` table.
7. **Zero-Leakage Response:** The client receives only `{ success: true }`. AI evaluation data never crosses the candidate boundary.

### Recruiter Flow
1. **Gated Access:** Recruiter navigates to `/admin` and completes the credential challenge (`admin@123`).
2. **Session Lease:** Authentication state is retained with a **2-hour sliding inactivity window** that automatically invalidates on idle timeout.
3. **Live Query:** `GET /api/admin/jobs/:id/applications` pulls candidates ordered descending by `llm_score`.
4. **Insight Inspection:** UI surfaces candidates grouped into performance tiers alongside AI-generated gap analyses and targeted interview probes.

---

## 3. Database Schema (Supabase / PostgreSQL)

### `jobs` Table
Stores recruiter-defined requisitions, company metadata, and scoring criteria.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, `gen_random_uuid()` | Unique job identifier |
| `title` | `TEXT` | `NOT NULL` | Role designation |
| `company` | `TEXT` | `NOT NULL` | Hiring enterprise or client entity |
| `description` | `TEXT` | `NOT NULL` | JD and target evaluation criteria |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Job creation timestamp |

### `applications` Table
Stores candidate submissions, raw extracted text, and private LLM evaluation metrics.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, `gen_random_uuid()` | Unique application ID |
| `job_id` | `UUID` | Foreign Key (`jobs.id` ON DELETE CASCADE) | Referenced position |
| `full_name` | `TEXT` | `NOT NULL` | Candidate legal name |
| `email` | `TEXT` | `NOT NULL` | Contact email |
| `phone` | `TEXT` | `NOT NULL` | Contact telephone |
| `age` | `INTEGER` | `NOT NULL` | Candidate age |
| `address` | `TEXT` | `NULLABLE` | Street address |
| `current_location`| `TEXT` | `NOT NULL` | City and country |
| `resume_text` | `TEXT` | `NOT NULL` | Extracted UTF-8 resume string |
| `llm_score` | `INTEGER` | `CHECK (llm_score BETWEEN 0 AND 100)` | Fit score (0–100) |
| `llm_summary` | `TEXT` | `NULLABLE` | Recruiter-only candidate summary |
| `llm_gaps` | `TEXT` | `NULLABLE` | Recruiter-only competency gaps |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Submission timestamp |

---

## 4. Core Design Decisions

### Document Parsing via Mammoth
* Handled server-side in `/lib/parseDocx.ts`.
* Removes XML boilerplate, visual styling, and formatting overhead.
* Eliminates OS-level dependencies (e.g., LibreOffice, unoconv).
* Rejects empty or corrupt extracts ($< 20$ characters) with an immediate **HTTP 400**.

### LLM Evaluation Engine
* **Inference Platform:** Groq Cloud LPU
* **Model:** `openai/gpt-oss-120b`
* **Output Format:** Enforced JSON object
* **Standard Output Contract:**
```json
{
  "score": 85,
  "summary": "Strong candidate-role alignment with robust technical experience.",
  "gaps": "Limited direct exposure to enterprise client management."
}
Context GuardrailsInput VariableCharacter BoundEngineering RationaleJob Description4,000 charsBounds context window, reduces latency, standardizes requisitionsResume Text7,000 charsPrevents token runaway, controls cost, mitigates prompt-injection attacksOutput Sanitization LayerLLM Output Stream 
      ▼
Regex Stripping (Remove ```json markdown fences)
      ▼
Remove unescaped control characters
      ▼
JSON.parse() validation
      ▼
Numeric Range Verification (score clamped between 0 and 100)
      ▼
Supabase Persistence
5. Security & Boundary EnforcementCandidate Privacy Shield: Candidates receive only { success: true }. The response payload never exposes llm_score, llm_summary, llm_gaps, or internal ranking criteria.Server-to-Server Authentication: Groq SDK and Supabase service-role keys are strictly maintained in server environments (process.env) and are never bundled into client-side code.Sliding Admin Lease: The recruiter console monitors client-side activity events (keydown, click, mousemove, scroll). A 2-hour inactivity timeout clears local authentication state.Explicit Session Revocation: Dedicated AdminNavbar component exposes a manual sign-out action to clear credentials on demand.6. Scoring & Fault Tolerance MatrixEvaluated Score TiersScore RangeTier ClassificationRouting Action80 – 100Strong FitFast-track shortlist candidate50 – 79ReviewSecondary manual recruiter assessment0 – 49Low / MismatchAuto-filtered with identified missing prerequisitesFault Tolerance HandlingFailure ScenarioMitigation StrategyEmpty or Corrupted .docxFast-fail at parser boundary with HTTP 400 Bad RequestResume Exceeds LimitServer slices text to first 7,000 characters before LLM callJD Exceeds LimitServer slices text to first 4,000 characters before LLM callMalformed LLM OutputPre-parsing cleanup strips code blocks; fallback values appliedScore Outside RangeClamped to nearest integer between 0 and 100Irrelevant CandidateEvaluated objectively with low score ($0\text{--}20$) and itemized gaps7. Technology StackFrontend: Next.js (App Router, React 19, Tailwind CSS)API Layer: Next.js Serverless Route HandlersDocument Parsing: Mammoth.js (.docx binary to plain text)Database: Supabase (PostgreSQL with Foreign Key Casings)AI Provider: Groq Cloud LPUModel: openai/gpt-oss-120b (JSON Mode)Deployment: Vercel

Core Operating Principle: Candidates submit. The server evaluates. PostgreSQL persists. Recruiters review. AI evaluation never crosses the candidate boundary.