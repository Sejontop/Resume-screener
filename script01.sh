#!/bin/bash
# Part 1: Dependencies, DB Setup Script, Libs

mkdir -p lib app/api/jobs app/api/apply app/api/admin/jobs components

cat << 'EOF' > supabase_setup.sql
-- Run this in your Supabase SQL Editor
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  age integer NOT NULL,
  current_location text NOT NULL,
  resume_text text NOT NULL,
  llm_summary text,
  llm_score integer,
  llm_gaps text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
EOF

cat << 'EOF' > .env.example
GROQ_API_KEY="your_groq_api_key_here"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url_here"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key_here"
EOF

cat << 'EOF' > lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
EOF

cat << 'EOF' > lib/groq.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'placeholder_key',
});

export async function evaluateResume(resumeText: string, jobDescription: string) {
  const prompt = `
You are an expert technical recruiter and hiring manager. 
Your task is to evaluate a candidate's resume against a specific job description.

Job Description:
${jobDescription}

Candidate Resume:
${resumeText}

Analyze the candidate's fit for the role. Provide your response as a JSON object with the following strictly defined schema:
{
  "summary": "A 2-3 sentence summary of the candidate's fit.",
  "score": <Numerical score between 0 and 100 representing the match percentage>,
  "gaps": "Specific gaps in their experience or skills relative to the JD, and 2-3 suggested follow-up interview questions."
}
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that strictly outputs JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) throw new Error("No response from Groq");
    
    return JSON.parse(responseContent);
  } catch (error) {
    console.error("Groq evaluation failed:", error);
    // Fallback response in case of error
    return {
      summary: "Evaluation failed to generate.",
      score: 0,
      gaps: "Could not evaluate due to an error."
    };
  }
}
EOF

cat << 'EOF' > lib/parseDocx.ts
import mammoth from 'mammoth';

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX file. Ensure it is a valid Word document.");
  }
}
EOF
