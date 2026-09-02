# Resume Screener AI — System Architecture

This document details the architectural design, data schemas, ingestion pipelines, and security model of the Clara AI Recruitment Screener.

---

## 1. High-Level Flowchart

[Candidate View (/)]
|
| 1. Submit Profile + .docx Resume
v
[POST /api/apply] (Serverless Route Handler)
|
+---> 2. Parse .docx Buffer via Mammoth
|
+---> 3. Fetch Targeted JD from Supabase ('jobs' table)
|
+---> 4. Sanitize inputs & slice context length
|
+---> 5. Evaluate Fit via Groq SDK (openai/gpt-oss-120b)
|        `--> Returns strict JSON: { score, summary, gaps }
|
+---> 6. Persist Record to Supabase ('applications' table)
|
v
[Response: { success: true }] ---> (Score & AI Summary Kept Private from Candidate)

[Recruiter / Admin View (/admin)]
|
| 1. Enter Passcode Challenge (admin@123)
| 2. Fetch Active Jobs (GET /api/jobs)
v
[GET /api/admin/jobs/[id]/applications]
|
+---> Queries Supabase ('applications' table)
|     `--> Filtered by job_id, ordered by llm_score DESC
v
[Admin Dashboard UI]
* Visual Metric Cards (Shortlist 80+, Review 50-79, Mismatch <50)
* Search Filtering & Quick Contact Actions
* AI Fit Summaries & Identified Skill Gaps / Interview Probes


---

## 2. Database Schema (Supabase / PostgreSQL)

The backend relies on two primary relational tables linked via foreign key constraints:

### `jobs` Table
Stores recruiter-created job descriptions and criteria.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK, default `gen_random_uuid()`) | Unique job identifier |
| `title` | `TEXT` | Role title (e.g., *Founders Office Associate*) |
| `company` | `TEXT` | Hiring organization |
| `description` | `TEXT` | Complete job description, qualifications, and criteria |
| `created_at` | `TIMESTAMPTZ` (default `now()`) | Timestamp of creation |

### `applications` Table
Stores candidate information, raw extracted resume text, and private evaluation insights.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK, default `gen_random_uuid()`) | Unique application identifier |
| `job_id` | `UUID` (FK -> `jobs.id`, ON DELETE CASCADE) | Referenced job role |
| `full_name` | `TEXT` | Candidate's legal name |
| `email` | `TEXT` | Contact email address |
| `phone` | `TEXT` | Contact phone number |
| `age` | `INTEGER` | Candidate age |
| `current_location` | `TEXT` | City, Country |
| `resume_text` | `TEXT` | Normalized plain text extracted from uploaded `.docx` |
| `llm_score` | `INTEGER` | Role match percentage evaluated by AI (0–100) |
| `llm_summary` | `TEXT` | 2–3 sentence candidate background & fit summary |
| `llm_gaps` | `TEXT` | Missing competencies & targeted interview questions |
| `created_at` | `TIMESTAMPTZ` (default `now()`) | Submission timestamp |

---

## 3. Component Breakdown

### A. Document Extraction (`/lib/parseDocx.ts`)
* Ingests binary buffers from multipart form submissions.
* Uses `mammoth.extractRawText` to convert Word documents (`.docx`) into normalized plaintext strings while stripping markup and stylistic baggage.
* Throws explicit validation errors if a file is unreadable, corrupted, or empty.

### B. LLM Screener Service (`/lib/groq.ts`)
* **Model:** `openai/gpt-oss-120b` running on Groq LPU inference engines.
* **Context Protection:** Slices incoming job descriptions to 4,000 characters and resume text to 7,000 characters to prevent payload overflows and token context breaches.
* **Structured Output Enforcement:** Uses `response_format: { type: "json_object" }` paired with a strict system prompt to guarantee structured JSON output (`score`, `summary`, `gaps`).
* **Sanitization Layer:** Cleans control characters and strips markdown code fences (````json ... ````) before executing `JSON.parse` to avoid parsing crashes on fringe or mismatched resumes.

### C. Public Candidate Ingestion (`/app/page.tsx` & `/app/api/apply/route.ts`)
* Exposes active roles fetched via `/api/jobs`.
* Accepts candidate forms and documents via `POST /api/apply`.
* **Privacy Isolation:** The route handler extracts text, completes the LLM evaluation, and writes to Supabase entirely server-side. The client response returns only `{ success: true }`, ensuring internal scores and recruiter notes are never exposed across the network to candidates.

### D. Recruiter Command Center (`/app/admin/page.tsx`)
* Gated by an administrative authentication barrier (`admin@123`).
* Summarizes application pools with dynamic metric cards: Total Evaluated, Strong Fit ($\ge 80$), Review ($50\text{--}79$), and Low-Fit ($< 50$).
* Renders ranked applicant cards sorted descending by `llm_score` with collapsible executive AI briefs, detected gaps, and generated interview follow-up questions.

---

## 4. Robustness & Error Mitigation

* **Empty / Non-DOCX Uploads:** Validated at both frontend form boundaries and API middleware checks (returns HTTP 400).
* **Severely Mismatched Profiles:** Evaluated with explicit scoring instructions; low-fit candidates (e.g., chefs applying for investment or strategy roles) receive baseline scores ($0\text{--}20$) alongside an itemized list of missing foundational prerequisites instead of throwing uncaught exceptions.
* **Database Isolation:** Supabase operations use parameterized queries and foreign key constraints to maintain relational integrity between positions and submissions.