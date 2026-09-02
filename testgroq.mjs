// import Groq from 'groq-sdk';
// import * as dotenv from 'dotenv';
// dotenv.config({ path: '.env' });

// console.log("Using API Key starting with:", (process.env.GROQ_API_KEY || '').slice(0, 8));

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function runTest() {
//   try {
//     const res = await groq.chat.completions.create({
//       model: 'llama-3.1-8b-instant',
//       messages: [{ role: 'user', content: 'Say hello in valid JSON format: {"message": "hello"}' }],
//       response_format: { type: 'json_object' }
//     });
//     console.log("GROQ SUCCESS:", res.choices[0].message.content);
//   } catch (err) {
//     console.error("GROQ FAILED WITH THIS REASON:", err);
//   }
// }

// runTest();
// import Groq from 'groq-sdk';
// import * as dotenv from 'dotenv';
// dotenv.config({ path: '.env' });

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function listModels() {
//   try {
//     const list = await groq.models.list();
//     console.log("AVAILABLE MODELS FOR YOUR KEY:");
//     const modelIds = list.data.map(m => m.id);
//     console.log(modelIds);
//   } catch (err) {
//     console.error("FAILED TO FETCH MODELS:", err);
//   }
// }

// listModels();
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function runTest() {
  try {
    const res = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'Output a valid JSON: {"status": "success"}' }],
      response_format: { type: 'json_object' }
    });
    console.log("TEST SUCCESS:", res.choices[0].message.content);
  } catch (err) {
    console.error("TEST FAILED:", err);
  }
}

runTest();