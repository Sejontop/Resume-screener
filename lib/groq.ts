import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'your_groq_api_key_here',
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
      model: 'openai/gpt-oss-120b',
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
