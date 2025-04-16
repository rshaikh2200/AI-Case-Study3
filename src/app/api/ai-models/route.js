import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI  }  from 'openai';
import axios        from 'axios';
import FormData     from 'form-data';
import fs           from 'fs';
import path         from 'path';

/* ───────────────────────── Google Custom Search helper ─────────────────── */
async function getMedicalCaseStudiesFromGoogle() {
  try {
    const searchTerm  = 'Case Studies';
    const searchDepth = 50;                 // original request depth
    const pageSize    = 10;                 // Google CSE max results per call

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId  = process.env.GOOGLE_CSE_ID;
    if (!googleApiKey || !googleCseId)
      throw new Error('Google API key or Custom Search Engine ID not configured.');

    const serviceUrl = 'https://www.googleapis.com/customsearch/v1';
    let combined     = '';

    /* paginate to respect the 10‑results limit */
    for (let start = 1; start <= searchDepth; start += pageSize) {
      const { data } = await axios.get(serviceUrl, {
        params: {
          q : searchTerm,
          key: googleApiKey,
          cx : googleCseId,
          num: pageSize,
          start,
          siteSearch: 'https://psnet.ahrq.gov/webmm-case-studies',
        },
      });

      if (!data?.items?.length) break;
      data.items.forEach((i) => (combined += `Source: ${i.link} - ${i.snippet}\n`));
    }

    return combined || 'No Google search results found for medical error case studies.';
  } catch (error) {
    console.error('Error in getMedicalCaseStudiesFromGoogle:', error.message);
    return 'Error retrieving Google search results.';
  }
}

/* ──────────────────────── JSON parsing helpers (unchanged) ─────────────── */
function parseCaseStudies(resp)            { /* … unchanged … */ }
function parseCaseStudiesWithAnswers(resp) { /* … unchanged … */ }

/* ────────────────────────────────  POST  ───────────────────────────────── */
export async function POST(request) {
  const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

  /* Hugging Face inference credentials (for case‑study generation) */
  const HF_INFERENCE_URL = process.env.HF_INFERENCE_URL;
  const HF_API_KEY       = process.env.HF_API_KEY;

  const pc     = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index  = pc.Index('coachcarellm').namespace('( Default )');
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization};`;

  /* ---------------- embeddings (OpenAI) ---------------- */
  let queryEmbedding;
  try {
    const emb = await openai.embeddings.create({
      input: query,
      model: 'text-embedding-ada-002',
    });
    if (!emb.data?.length) throw new Error('Invalid embedding data.');
    queryEmbedding = emb.data[0].embedding;
  } catch (err) {
    console.error('Error creating embedding:', err);
    return NextResponse.json({ error: 'Embedding failure.' }, { status: 500 });
  }

  /* ---------------- Pinecone similarity ---------------- */
  let similarCaseStudies = [];
  try {
    const pine = await index.query({
      vector: queryEmbedding,
      topK : 500,
      includeMetadata: true,
    });
    similarCaseStudies = pine.matches.map((m) => m.metadata.content);
  } catch (err) {
    console.error('Error querying Pinecone:', err);
    return NextResponse.json({ error: 'Pinecone query failed.' }, { status: 500 });
  }

  /* ---------------- Google enrichment ------------------ */
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();
  const retrievedCasesText = similarCaseStudies.join('\n');

  /* ---------------- FULL META_PROMPT (unchanged text) -- */
  const META_PROMPT = 
    `Use the medical case study text from ${retrievedCasesText}, to write 4 similar medical case studies (250 words) that are tailored towards a ${role} specializing in ${specialization} working in the ${department} department, without compromising the clinical integrity. Remove extraneous information such as providers’ 
countries of origin or unnecessary backstories.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case study should only include the scenario and the medical error that occured.
  - The case studies should not mention country names, staff origins.
  - Use unique patient and medical staff names from various continents (America, Canada, South America, 
    Europe, Asia, Australia) to reflect global diversity.
  - The case study should include proper age for the patients. 
  - The case study should define medication with quantity with proper units, and proper names without changing the clinical integrity from source  ${retrievedCasesText} case study.
  - Keep the case studies short and concise, and do not mention countries by name or the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any error prevention tools and how they the situation lacked the EPT which could have avoided the error.
  - The case study should  only include the scenario and remove /not include any analysis on what went wrong, how it could have been prevented, and any highlights of the process to fix the issue. 
  - If department is ${department} make sure all the case studies scenario focus on stroke related medical errors and scenarios, but also Make sure the clinical scenario and clinical integretity remains similar to the original  ${retrievedCasesText} case studies
  - For all case studies, make sure the clinical scenario and clinical integretity remains similar to the original  ${retrievedCasesText} case studies.

  - **Incorporate the following feedback into the case studies and questions without altering any other instructions or logic:**
  - If ${role} equals registered nurse, ensure nurses do not write medication orders; they may administer medications, and if there is a concern from another nurse, that nurse would apply ARCC (not the one administering).
  - Ensure correct usage and spelling of \\mmHg\\ and other units.
  - If ${role} equals Nurse Practictioner or Medical Aisstant,  they typically write medication orders rather than administer them; they may have a peer check their order electronically before finalizing.
  - Use **unique names** for the patient and provider; avoid any duplicate names.
  - For **medication allegeries**, reflect a more appropriate and clinical accurate reactions.
  - Make sure the case study follow clinical integrity when describing when a patient should take a certain medication, or timely adminstration of medication.
  - make sure certain medication should be administered via a pump if it’s an infusion (not via injection), this should follow the clinical integrity.
  - Correct and make sure there is no misspelling in Medication Nmaes, and Procedures. 
  - Documentation is typically **electronic**, so do not mention paper order sheets.
  - If you include ARCC, it should be used properly by the person raising the concern, not necessarily by the one providing direct care.

    - **For each case study, create 3 unique multiple-choice questions that:**
        - Have 4 option choices each.
        - Debrief is typically a group effort; the question should not reflect debrief being done by a single individual.
        - Provide the correct answer choice and answer in the format: \\correct answer: C) Validate and Verify\\
        - Provide the hint in the format: \\Hint: Double-checking and confirming accuracy before proceeding.\\
        - In the question include specific key words hints based on the correct answer choice, utilizing the definition of the safety behavior to assist the user. The safety behaviors name should not be included in the question.
        - Each question should strictly focus on the assigned safety behavior and how it could have been applied to prevent the error in the case study.
        - Include clues by using buzzwords or synonyms from the correct answer's definition.
        -  Do not explicitly mention the prevention tools by name in the question header.
        - The question should be straightforward and concise; do not state any buzzwords in the question itself (e.g., using buzzwords like “check” or “validate?”).
          - The question should address ${role} directly and following this example format: If Dr. Patel would have stopped the line to address concerns immediately, which Safety Behavior that focuses on stopping and addressing concerns would he be applying

    
    - **Strictly follow the Question Structure Below and make sure the options choices match the correct safety behaviors focused in the question:**
      - **Case Study 1:**
        - Question 1: Focuses on Peer Checking and Coaching
        - Question 2: Focuses on Debrief
        - Question 3: Focuses on ARCC
    
      **Case Study 2:**
        - Question 1: Focuses on Validate and Verify
        - Question 2: Focuses on STAR
        - Question 3: Focuses on No Distraction Zone
    
      **Case Study 3:**
        - Question 1: Focuses on Effective Handoffs
        - Question 2: Focuses on Read and Repeat Back
        - Question 3: Focuses on Ask Clarifying Questions
    
      **Case Study 4:**
        - Question 1: Focuses on Alphanumeric Language
        - Question 2: Focuses on SBAR
        - Question 3: Focuses on STAR
    
    - **Use the following 11 Safety Behaviors and Definitions:**
    
        a. Peer Checking and Coaching
            Definition: Peer Check (Ask your colleagues to review your work and offer assistance in reviewing the work of others). Peer Coach (coach to reinforce: celebrate it publicly when someone does something correctly, coach to correct: correct someone (privately when possible) when something is done incorrectly.)
    
        b. Debrief
            Definition: Reflect on what went well with team , what didn't, how to improve, and who will follow through. All team members should freely speak up. A debrief typically lasts only 3 minutes.
      
        c. ARCC
            Definition: Ask a question to gently prompt the other person of potential safety issue, Request a change to make sure the person is fully aware of the risk. Voice a Concern if the person is resistant. Use the Chain of command if the possibility of patient harm persists.
    
        d. Validate and Verify
            Definition: An internal Check (Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?). Verify (check with an independent qualified source).
    
        e. STAR
            Definition: Stop (pause for 2 seconds to focus on task at hand), Think (consider action you're about to take), Act (concentrate and carry out the task), Review (check to make sure the task was done right and you got the right result).
    
        f. No Distraction Zone
            Definition: 1) Avoid interrupting others while they are performing critical tasks 2) Avoid distractions while completing critical tasks: Use phrases like "Stand by" or "Hold on".
    
        g. Effective Handoffs
            Definition: Six important principles that make an Effective Handoffs: Standardized and streamlined, Distraction-Free Environment, Face-to-face/bedside (interactive), Acknowledgments/repeat backs, Verbal with written/ printed information, Opportunity for questions/clarification.
    
        h. Read and Repeat Back
            Definition: 1) Sender communicates information to receiver, 2) receiver listens or writes down the information and reads/repeats it back as written or heard to the sender. 3) Sender then acknowledges the accuracy of the read-back by stating "that's correct". If not correct the sender repeats/clarifies the communication beginning the three steps again.
    
        i. Ask Clarifying Questions
            Definition: Requesting Additional information, and expressing concerns to avoid misunderstandings.
    
        j. Using Alphanumeric Language
            Definition: Consists of using clear letters and numbers in communication such as replacing fifteen with one-five, and using phonetic alphabet letters instead of Latin alphabet.
    
        k. SBAR
            Definition: Situation (what is the situation, patient or project?), Background (what is important to communicate including problems and precautions?), Assessment (what is my assessment of the situation, problems, and precautions.), Recommendations (what is my recommendation, request, or plan?)
    
    Ensure the following format is strictly followed and output the entire response as valid JSON.
    
    \`\`\`json
    {
      "caseStudies": [
        {
          },
            "department" : "${department}",
            "role" : "${role}",
            "specialization": "${specialization}",
            "care": "${care}",
        },
    
          "caseStudy": "Case Study 1",
          "scenario": "Description of the case study scenario.",
          "questions": [
            {
              "question": "Question 1 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "C) correct answer",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            },
            {
              "question": "Question 2 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "b) correct answer",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            },
            {
              "question": "Question 3 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "A) correct answer ",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            }
          ]
       }
        // Repeat for Case Study 2, 3, and 4
      ]
    }
    \`\`\`
    
    Ensure that:
    
    - The JSON is **well-formatted** and **free of any syntax errors**.
    - There are **no comments** (e.g., lines starting with //), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.`;


  /* ───────────── Hugging Face generation (robust) ────── */
  let aiResponse;
  try {
    const hfRes = await fetch(HF_INFERENCE_URL, {
      method : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization : `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: META_PROMPT }),
    });

    if (!hfRes.ok) {
      const errPayload = await hfRes.text();          // may or may not be JSON
      console.error('HF API Error payload:', errPayload);
      throw new Error(`HF API responded ${hfRes.status}`);
    }

    const contentType = hfRes.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await hfRes.json()
      : await hfRes.text();

    /* Accept common payload shapes */
    if (Array.isArray(data) && data[0]?.generated_text) {
      aiResponse = data[0].generated_text;
    } else if (typeof data === 'object' && data.generated_text) {
      aiResponse = data.generated_text;
    } else if (typeof data === 'string') {
      aiResponse = data;
    }

    if (!aiResponse || typeof aiResponse !== 'string' || !aiResponse.trim())
      throw new Error('No generated_text returned by HF endpoint.');
    console.log('Raw Model Output (HF):', aiResponse);
  } catch (err) {
    console.error('HF generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  /* ---------------- save raw output (unchanged) -------- */
  try {
    const tmpDir = '/tmp/case studies json';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const fileName = `case-studies-${Date.now()}.json`;
    const tmpPath  = path.join(tmpDir, fileName);
    fs.writeFileSync(
      tmpPath,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          department,
          role,
          care,
          specialization,
          rawModelOutput: aiResponse,
        },
        null,
        2
      ),
      'utf8'
    );

    const appDir = path.join(process.cwd(), 'src', 'app');
    if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
    fs.copyFileSync(tmpPath, path.join(appDir, fileName));
  } catch (err) {
    console.error('Error saving JSON file:', err);
  }

  /* ---------------- parse model output (unchanged) ----- */
  const parsedCaseStudies            = parseCaseStudies(aiResponse);
  let   parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);

  /* ---------------- generate images (unchanged) -------- */
  try {
    const withPrompts = await Promise.all(
      parsedCaseStudiesWithAnswers.map(async (cs) => {
        const { prompt } = await generateImagePrompt(cs);
        return { ...cs, imagePrompt: prompt };
      })
    );
    const withImages = await fetchImagesForCaseStudies(withPrompts);
    parsedCaseStudiesWithAnswers = withImages;

    const clientData = parsedCaseStudiesWithAnswers.map((cs) => ({
      caseStudy    : cs.caseStudy,
      scenario     : cs.scenario,
      questions    : cs.questions.map((q) => ({
        question     : q.question,
        options      : q.options,
        correctAnswer: q.correctAnswer,
        hint         : q.hint,
      })),
      imageUrl     : cs.imageUrl,
      role         : cs.role,
      department   : cs.department,
      specialization: cs.specialization,
    }));

    return NextResponse.json({ caseStudies: clientData, aiResponse: parsedCaseStudiesWithAnswers });
  } catch (error) {
    console.error('Error generating images:', error);
    return NextResponse.json({ error: 'Image generation failed.' }, { status: 500 });
  }
}

/* generateImagePrompt & fetchImagesForCaseStudies are UNCHANGED            */
async function generateImagePrompt(caseStudy) { /* … original function … */ }
async function fetchImagesForCaseStudies(cs, model='sd3-large', aspect='1:1') { /* … original … */ }
