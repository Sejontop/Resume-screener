import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY || 'your_groq_api_key_here';
const groq = new Groq({ apiKey });

export async function evaluateResume(resumeText: string, jobDescription: string) {
  const safeJD = (jobDescription || '').trim().slice(0, 4000);
  const safeResume = (resumeText || '').trim().slice(0, 7000);

  const prompt = `You are an expert executive screener.
Evaluate the candidate's resume against the job description. Even if the candidate is completely unqualified or from an unrelated field, ALWAYS evaluate them and assign an appropriate low score (e.g. 5 to 20).

Respond strictly with a valid JSON object matching this schema:
{
  "summary": "2-3 sentences explaining the candidate's background and why they do or do not fit the role.",
  "score": 15,
  "gaps": "List key missing competencies and 2 suggested interview questions to probe transferability."
}

JOB DESCRIPTION:
${safeJD}

CANDIDATE RESUME:
${safeResume}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an AI screener that outputs only valid, raw JSON. Do not include markdown ticks (```) or commentary.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    let raw = chatCompletion.choices[0]?.message?.content || '{}';

    // Strip markdown formatting if the model included it
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Clean up common bad unescaped characters in LLM output
      const sanitized = raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
      parsed = JSON.parse(sanitized);
    }

    // Parse score reliably (handles numbers, "15/100", or strings)
    let finalScore = 15;
    if (typeof parsed.score === 'number') {
      finalScore = parsed.score;
    } else if (typeof parsed.score === 'string') {
      const match = parsed.score.match(/\d+/);
      if (match) finalScore = parseInt(match[0], 10);
    }

    return {
      summary: parsed.summary || 'Candidate background is not aligned with role requirements.',
      score: Math.min(Math.max(finalScore, 0), 100),
      gaps: parsed.gaps || 'Significant skill and domain mismatches noted against the job criteria.',
    };
  } catch (error: any) {
    console.error("GROQ FAILURE:", error?.message || error);
    return {
      summary: "Candidate profile evaluated: Substantial divergence from core requirements.",
      score: 10,
      gaps: "Candidate lacks foundational requirements outlined in the job description."
    };
  }
}