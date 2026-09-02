// import { NextResponse } from 'next/server';
// import { supabase } from '@/lib/supabase';
// import { extractTextFromDocx } from '@/lib/parseDocx';
// import { evaluateResume } from '@/lib/groq';

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
    
//     const jobId = formData.get('jobId') as string;
//     const fullName = formData.get('fullName') as string;
//     const address = formData.get('address') as string;
//     const phone = formData.get('phone') as string;
//     const email = formData.get('email') as string;
//     const age = parseInt(formData.get('age') as string, 10);
//     const currentLocation = formData.get('currentLocation') as string;
//     const resumeFile = formData.get('resume') as File;

//     if (!jobId || !fullName || !address || !phone || !email || !age || !currentLocation || !resumeFile) {
//       return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
//     }

//     if (!resumeFile.name.endsWith('.docx')) {
//       return NextResponse.json({ error: 'Only .docx files are allowed.' }, { status: 400 });
//     }

//     // Parse the docx
//     const arrayBuffer = await resumeFile.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);
//     let resumeText = '';
//     try {
//       resumeText = await extractTextFromDocx(buffer);
//     } catch (e) {
//       return NextResponse.json({ error: 'Could not read DOCX file. It might be corrupted.' }, { status: 400 });
//     }

//     if (!resumeText || resumeText.trim().length === 0) {
//       return NextResponse.json({ error: 'The uploaded resume is empty.' }, { status: 400 });
//     }

//     // Get the job description to evaluate against
//     const { data: job, error: jobError } = await supabase
//       .from('jobs')
//       .select('description')
//       .eq('id', jobId)
//       .single();

//     if (jobError || !job) {
//       return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
//     }

//     // Evaluate using Groq LLM (This is completely server-side, keeping results private)
//     let evaluation = { summary: null, score: null, gaps: null };
//     try {
//       evaluation = await evaluateResume(resumeText, job.description);
//     } catch (e) {
//       console.error("Evaluation failed, but continuing with application insertion.", e);
//     }

//     // Insert the application into Supabase
//     const { error: insertError } = await supabase
//       .from('applications')
//       .insert([{
//         job_id: jobId,
//         full_name: fullName,
//         address,
//         phone,
//         email,
//         age,
//         current_location: currentLocation,
//         resume_text: resumeText,
//         llm_summary: evaluation.summary,
//         llm_score: evaluation.score,
//         llm_gaps: evaluation.gaps
//       }]);

//     if (insertError) {
//       throw insertError;
//     }

//     // Do NOT send the score back to the client.
//     return NextResponse.json({ success: true });
//   } catch (error: any) {
//     console.error("Apply error:", error);
//     return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
//   }
// }
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTextFromDocx } from '@/lib/parseDocx';
import { evaluateResume } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const jobId = formData.get('jobId') as string;
    const fullName = formData.get('fullName') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const age = parseInt(formData.get('age') as string, 10);
    const currentLocation = formData.get('currentLocation') as string;
    const resumeFile = formData.get('resume') as File;

    if (!jobId || !fullName || !address || !phone || !email || isNaN(age) || !currentLocation || !resumeFile) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!resumeFile.name.endsWith('.docx')) {
      return NextResponse.json({ error: 'Only .docx files are allowed.' }, { status: 400 });
    }

    // 1. Parse DOCX
    const arrayBuffer = await resumeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let resumeText = '';
    try {
      resumeText = await extractTextFromDocx(buffer);
    } catch (e) {
      console.error('[APPLY ROUTE] Mammoth parsing error:', e);
      return NextResponse.json({ error: 'Could not read DOCX file. It might be corrupted.' }, { status: 400 });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json({ error: 'The uploaded resume is empty.' }, { status: 400 });
    }

    console.log(`[APPLY ROUTE] Successfully extracted resume for "${fullName}". Length: ${resumeText.length} chars.`);

    // 2. Fetch Job Description from Supabase
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, description')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[APPLY ROUTE] Job lookup failed:', jobError);
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    console.log(`[APPLY ROUTE] Matched Job: "${job.title}". JD length: ${job.description?.length || 0} chars.`);

    // 3. Evaluate using Groq LLM
    let evaluation = { summary: null, score: null, gaps: null };
    try {
      console.log('[APPLY ROUTE] Sending payload to Groq...');
      evaluation = await evaluateResume(resumeText, job.description);
      console.log('[APPLY ROUTE] Evaluation received from Groq:', evaluation);
    } catch (e) {
      console.error('[APPLY ROUTE] Critical evaluation failure:', e);
    }

    // 4. Insert into Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('applications')
      .insert([{
        job_id: jobId,
        full_name: fullName,
        address,
        phone,
        email,
        age,
        current_location: currentLocation,
        resume_text: resumeText,
        llm_summary: evaluation.summary,
        llm_score: evaluation.score,
        llm_gaps: evaluation.gaps
      }])
      .select();

    if (insertError) {
      console.error('[APPLY ROUTE] Supabase insertion error:', insertError);
      throw insertError;
    }

    console.log('[APPLY ROUTE] Successfully inserted record with ID:', insertedData?.[0]?.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[APPLY ROUTE] General failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}