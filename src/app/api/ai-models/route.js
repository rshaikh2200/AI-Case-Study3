/* -------------------------------------------------------------------------- */
/*  app/api/route.js  (or the file you originally posted)                     */
/* -------------------------------------------------------------------------- */

import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI  }  from 'openai';
import axios        from 'axios';
import FormData     from 'form-data';
import fs           from 'fs';
import path         from 'path';

/* -------------------------------------------------------------------------- */
/* Google Custom Search helper (unchanged)                                    */
/* -------------------------------------------------------------------------- */
async function getMedicalCaseStudiesFromGoogle() {
  try {
    const searchTerm  = "Case Studies";
    const searchDepth = 50;

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId  = process.env.GOOGLE_CSE_ID;
    if (!googleApiKey || !googleCseId)
      throw new Error("Google API key or Custom Search Engine ID not configured.");

    const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        q : searchTerm,
        key: googleApiKey,
        cx : googleCseId,
        num: searchDepth,
        siteSearch: "https://psnet.ahrq.gov/webmm-case-studies",
      },
    });

    let combined = "";
    if (data?.items?.length)
      data.items.forEach((i) => (combined += `Source: ${i.link} - ${i.snippet}\n`));
    else
      combined = "No Google search results found for medical error case studies.";

    return combined;
  } catch (err) {
    console.error("Error in getMedicalCaseStudiesFromGoogle:", err.message);
    return "Error retrieving Google search results.";
  }
}

/* -------------------------------------------------------------------------- */
/* Parsing helpers (unchanged)                                                */
/* -------------------------------------------------------------------------- */
function parseCaseStudies(responseText) {
  try {
    let jsonString = "";
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) jsonString = jsonMatch[1];
    else                           jsonString = responseText;

    jsonString = jsonString
      .replace(/\/\/.*$/gm, "")            // remove JS‑style comments
      .replace(/,\s*([}\]])/g, "$1");      // remove trailing commas

    const parsed = JSON.parse(jsonString);
    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies))
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions))
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      cs.questions.forEach((q, qIdx) => {
        if (!q.question || !q.options || Object.keys(q.options).length !== 4)
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      caseStudy: `Case Study ${index + 1}`,
      scenario : cs.scenario,
      questions: cs.questions.map((q) => ({
        question: q.question,
        options : Object.entries(q.options).map(([key, label]) => ({ key, label })),
      })),
    }));
  } catch (err) {
    console.error("Error parsing JSON response:", err.message);
    console.error("Received Response:", responseText);
    throw new Error("Failed to parse case studies JSON. Ensure the model outputs valid JSON.");
  }
}

function parseCaseStudiesWithAnswers(responseText) {
  try {
    let jsonString = "";
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) jsonString = jsonMatch[1];
    else                           jsonString = responseText;

    jsonString = jsonString
      .replace(/\/\/.*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1");

    const parsed = JSON.parse(jsonString);
    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies))
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions))
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      cs.questions.forEach((q, qIdx) => {
        if (
          !q.question ||
          !q.options  || Object.keys(q.options).length !== 4 ||
          !q["correct answer"] || !q["Hint"]
        )
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      department    : cs.department,
      role          : cs.role,
      specialization: cs.specialization,
      caseStudy     : `Case Study ${index + 1}`,
      scenario      : cs.scenario,
      questions     : cs.questions.map((q) => ({
        question     : q.question,
        options      : Object.entries(q.options).map(([k, v]) => ({ key: k, label: v })),
        correctAnswer: q["correct answer"],
        hint         : q["Hint"],
      })),
    }));
  } catch (err) {
    console.error("Error parsing JSON response with answers:", err.message);
    console.error("Received Response:", responseText);
    throw new Error(
      "Failed to parse case studies JSON with correct answers. Ensure the model outputs valid JSON."
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST handler                                                               */
/* -------------------------------------------------------------------------- */
export async function POST(request) {
  const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;  // still used elsewhere
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

  /* ---- NEW env vars for Hugging Face text generation ---- */
  const HF_INFERENCE_URL = process.env.HF_INFERENCE_URL;
  const HF_API_KEY       = process.env.HF_API_KEY;

  const pc     = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index  = pc.Index("coachcarellm").namespace("( Default )");
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization};`;

  /* ---------------- Embedding (OpenAI, unchanged) ---------------- */
  let queryEmbedding;
  try {
    const emb = await openai.embeddings.create({
      input: query,
      model: "text-embedding-ada-002",
    });
    if (!emb.data?.length) throw new Error("Invalid embedding data structure.");
    queryEmbedding = emb.data[0].embedding;
  } catch (err) {
    console.error("Error creating embedding:", err);
    return NextResponse.json({ error: "Failed to create embedding for the query." }, { status: 500 });
  }

  /* ---------------- Pinecone similarity (unchanged) -------------- */
  let similarCaseStudies = [];
  try {
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK : 500,
      includeMetadata: true,
    });
    similarCaseStudies = pineconeResponse.matches.map((m) => m.metadata.content);
  } catch (err) {
    console.error("Error querying Pinecone:", err);
    return NextResponse.json(
      { error: "Failed to retrieve similar case studies from Pinecone." },
      { status: 500 }
    );
  }

  /* ---------------- Google custom search (unchanged) -------------- */
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();
  const retrievedCasesText = similarCaseStudies.join("\n");

  /* ---------------- ---------- FULL META PROMPT ------------------- */
  const META_PROMPT = `Use the medical case study text from ${retrievedCasesText}, to write 4 similar medical case studies (250 words) that are tailored towards a ${role} specializing in ${specialization} working in the ${department} department, without compromising the clinical integrity. Remove extraneous information such as providers’ countries of origin or unnecessary backstories.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case study should only include the scenario and the medical error that occured.
  - The case studies should not mention country names, staff origins.
  - Use unique patient and medical staff names from various continents (America, Canada, South America, Europe, Asia, Australia) to reflect global diversity.
  - The case study should include proper age for the patients.
  - The case study should define medication with quantity with proper units, and proper names without changing the clinical integrity from source ${retrievedCasesText} case study.
  - Keep the case studies short and concise, and do not mention countries by name or the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any error prevention tools and how they the situation lacked the EPT which could have avoided the error.
  - The case study should only include the scenario and remove /not include any analysis on what went wrong, how it could have been prevented, and any highlights of the process to fix the issue.
  - If department is ${department} make sure all the case studies scenario focus on stroke related medical errors and scenarios, but also Make sure the clinical scenario and clinical integretity remains similar to the original ${retrievedCasesText} case studies
  - For all case studies, make sure the clinical scenario and clinical integretity remains similar to the original ${retrievedCasesText} case studies.

- **Incorporate the following feedback into the case studies and questions without altering any other instructions or logic:**
  - If ${role} equals registered nurse, ensure nurses do not write medication orders; they may administer medications, and if there is a concern from another nurse, that nurse would apply ARCC (not the one administering).
  - Ensure correct usage and spelling of \\mmHg\\ and other units.
  - If ${role} equals Nurse Practictioner or Medical Aisstant, they typically write medication orders rather than administer them; they may have a peer check their order electronically before finalizing.
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
  - Do not explicitly mention the prevention tools by name in the question header.
  - The question should be straightforward and concise; do not state any buzzwords in the question itself (e.g., using buzzwords like “check” or “validate?”).
  - The question should address ${role} directly and following this example format: If Dr. Patel would have stopped the line to address concerns immediately, which Safety Behavior that focuses on stopping and addressing concerns would he be applying

- **Strictly follow the Question Structure Below and make sure the options choices match the correct safety behaviors focused in the question:**

  - **Case Study 1:**
    - Question 1: Focuses on Peer Checking and Coaching
    - Question 2: Focuses on Debrief
    - Question 3: Focuses on ARCC

  - **Case Study 2:**
    - Question 1: Focuses on Validate and Verify
    - Question 2: Focuses on STAR
    - Question 3: Focuses on No Distraction Zone

  - **Case Study 3:**
    - Question 1: Focuses on Effective Handoffs
    - Question 2: Focuses on Read and Repeat Back
    - Question 3: Focuses on Ask Clarifying Questions

  - **Case Study 4:**
    - Question 1: Focuses on Alphanumeric Language
    - Question 2: Focuses on SBAR
    - Question 3: Focuses on STAR

- **Use the following 11 Safety Behaviors and Definitions:**
  a. Peer Checking and Coaching — definition: Peer Check (Ask your colleagues to review your work and offer assistance in reviewing the work of others). Peer Coach (coach to reinforce: celebrate it publicly when someone does something correctly, coach to correct: correct someone (privately when possible) when something is done incorrectly.)
  b. Debrief — definition: Reflect on what went well with team, what didn't, how to improve, and who will follow through. All team members should freely speak up. A debrief typically lasts only 3 minutes.
  c. ARCC — definition: Ask a question to gently prompt the other person of potential safety issue, Request a change to make sure the person is fully aware of the risk. Voice a Concern if the person is resistant. Use the Chain of command if the possibility of patient harm persists.
  d. Validate and Verify — definition: An internal Check (Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?). Verify (check with an independent qualified source).
  e. STAR — definition: Stop (pause for 2 seconds to focus on task at hand), Think (consider action you're about to take), Act (concentrate and carry out the task), Review (check to make sure the task was done right and you got the right result).
  f. No Distraction Zone — definition: 1) Avoid interrupting others while they are performing critical tasks 2) Avoid distractions while completing critical tasks: Use phrases like "Stand by" or "Hold on".
  g. Effective Handoffs — definition: Six important principles that make an Effective Handoffs: Standardized and streamlined, Distraction-Free Environment, Face-to-face/bedside (interactive), Acknowledgments/repeat backs, Verbal with written/ printed information, Opportunity for questions/clarification.
  h. Read and Repeat Back — definition: 1) Sender communicates information to receiver, 2) receiver listens or writes down the information and reads/repeats it back as written or heard to the sender. 3) Sender then acknowledges the accuracy of the read-back by stating "that's correct". If not correct the sender repeats/clarifies the communication beginning the three steps again.
  i. Ask Clarifying Questions — definition: Requesting Additional information, and expressing concerns to avoid misunderstandings.
  j. Using Alphanumeric Language — definition: Consists of using clear letters and numbers in communication such as replacing fifteen with one‑five, and using phonetic alphabet letters instead of Latin alphabet.
  k. SBAR — definition: Situation (what is the situation, patient or project?), Background (what is important to communicate including problems and precautions?), Assessment (what is my assessment of the situation, problems, and precautions.), Recommendations (what is my recommendation, request, or plan?)

Ensure the following format is strictly followed and output the entire response as valid JSON.

\`\`\`json
{
  "caseStudies": [
    {
      },
      "department"   : "${department}",
      "role"         : "${role}",
      "specialization": "${specialization}",
      "care"         : "${care}",
    },
    "caseStudy": "Case Study 1",
    "scenario" : "Description of the case study scenario.",
    "questions": [
      {
        "question": "Question 1 text",
        "options" : { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
        "correct answer": "C) correct answer",
        "Hint": "1 sentence sumarized definition of correct answer choice."
      },
      {
        "question": "Question 2 text",
        "options" : { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
        "correct answer": "b) correct answer",
        "Hint": "1 sentence sumarized definition of correct answer choice."
      },
      {
        "question": "Question 3 text",
        "options" : { "A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D" },
        "correct answer": "A) correct answer ",
        "Hint": "1 sentence sumarized definition of correct answer choice."
      }
    ]
  }
  // Repeat for Case Study 2, 3, and 4
]
}
\`\`\`

Ensure that:
- The JSON is **well‑formatted** and **free of any syntax errors**.
- There are **no comments** (e.g., lines starting with //), **no trailing commas**, and **no additional text** outside the JSON block.
- The JSON is enclosed within \`\`\`json and \`\`\` code fences. Do not include any additional text outside the JSON structure.`.trim();

  /* ---------------------------------------------------------------------- */
  /*  CASE‑STUDY GENERATION  →  Hugging Face                                */
  /* ---------------------------------------------------------------------- */
  let aiResponse;
  try {
    const hfRes = await fetch(HF_INFERENCE_URL, {
      method : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization : `Bearer ${HF_API_KEY}`,
      },
      body   : JSON.stringify({ inputs: META_PROMPT }),
    });

    if (!hfRes.ok) {
      const err = await hfRes.json();
      console.error("Error from HF API:", err);
      throw new Error(err.error || "Unknown Hugging Face error");
    }

    const hfData = await hfRes.json();
    aiResponse = Array.isArray(hfData) ? hfData[0]?.generated_text : hfData?.generated_text;
    if (!aiResponse) throw new Error("No content returned from Hugging Face.");
    console.log("Raw Model Output (HF):", aiResponse);
  } catch (err) {
    console.error("Unexpected Error (HF generation):", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate case studies." },
      { status: 500 }
    );
  }

  /* ---------------- SAVE raw output (unchanged) ------------------------- */
  try {
    const tmpDir = "/tmp/case studies json";
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
      "utf8"
    );

    const appDir = path.join(process.cwd(), "src", "app");
    if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
    fs.copyFileSync(tmpPath, path.join(appDir, fileName));
  } catch (err) {
    console.error("❌ Error saving JSON file:", err);
  }

  /* ---------------- PARSE response (unchanged) -------------------------- */
  const parsedCaseStudies            = parseCaseStudies(aiResponse);
  let parsedCaseStudiesWithAnswers   = parseCaseStudiesWithAnswers(aiResponse);

  /* ---------------- IMAGE prompt + generation (unchanged) --------------- */
  try {
    const withPrompts = await Promise.all(
      parsedCaseStudiesWithAnswers.map(async (cs) => {
        const { prompt } = await generateImagePrompt(cs);
        return { ...cs, imagePrompt: prompt };
      })
    );
    const withImages = await fetchImagesForCaseStudies(withPrompts);
    parsedCaseStudiesWithAnswers = withImages;

    const clientReturn = parsedCaseStudiesWithAnswers.map((cs) => ({
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

    return NextResponse.json({ caseStudies: clientReturn, aiResponse: parsedCaseStudiesWithAnswers });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "Failed to generate images for case studies." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* generateImagePrompt  (unchanged except full meta prompt included)         */
/* -------------------------------------------------------------------------- */
async function generateImagePrompt(caseStudy) {
  const META_PROMPT = `You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation based on given scenarios. Your prompts should be clear, vivid, and free of any NSFW (Not Safe For Work) content. Ensure that the prompts are suitable for use with image generation models and accurately reflect the provided scenario.

# Guidelines
- **Understand the Scenario**: Carefully read the provided scenario to grasp the context, key elements, and desired visual aspects.
- **Detail and Clarity**: Include specific details such as settings, characters, objects, actions, and emotions to create a vivid image in the mind of the image generation model.
- **Realistic Proportions and Placement**:
  - **Proportions**: Ensure that all characters and objects are proportionally accurate. Specify the size relationships between characters and objects (e.g., "a tall character standing next to a small table").
  - **Placement**: Clearly define the spatial arrangement of elements within the scene (e.g., "the character is seated on the left side of the table, while the lamp is positioned on the right").
  - **Orientation and Scale**: Mention the orientation and scale to maintain consistency (e.g., "the character is facing forward with arms at their sides").
  - **Avoid Overlapping**: Ensure that characters and objects do not overlap unnaturally unless intended for the scenario.
  - **Anatomical Accuracy**: Describe body parts accurately to maintain realistic anatomy (e.g., "the character has a proportionate head, torso, arms, and legs").
- **Avoid NSFW Content**: Ensure that the prompt does not contain or imply any inappropriate, offensive, or unsafe content.
- **Diverse Characters**: Ensure diverse characters with diverse races, genders, and backgrounds.
- **Language and Tone**: Use clear and concise language. Maintain a neutral and professional tone.
- **Formatting**: Present the prompt as a single, well-structured paragraph without any markdown or code blocks.
- **Consistency**: Maintain consistency in descriptions, avoiding contradictions or vague terms.
- **Descriptive Adjectives**: Utilize descriptive adjectives to enhance the visual richness of the prompt.
- **Characters**: Characters should consist of different races, genders, and religions.

# Steps
1. **Analyze the Scenario**: Identify the main elements such as location, characters, objects, and actions.
2. **Expand on Details**: Add descriptive elements to each identified component to enrich the prompt.
3. **Ensure Realistic Proportions and Placement**: Define the size relationships, spatial arrangements, and anatomical accuracy of all elements.
4. **Ensure Appropriateness**: Review the prompt to eliminate any NSFW content or implications.
5. **Finalize the Prompt**: Ensure the prompt is cohesive, vivid, and suitable for image generation.
5. **Ensure the image does not looked animated, cartoon, and look realistict.**

# Output Format
- **Format**: Plain text paragraph.
- **Length**: Approximately 40‑60 words, providing sufficient detail without being overly verbose.
- **Style**: Descriptive and clear, suitable for feeding directly into an image generation model.

# Example
**Image Prompt**: "A bustling hospital emergency room at night, illuminated by bright overhead lights. Doctors and nurses in white coats move swiftly between beds, attending to patients with focused expressions. A tall doctor stands next to a small examination table, while a nurse adjusts a monitor on the adjacent wall. Medical equipment and monitors line the walls, and the atmosphere is tense yet organized, reflecting the urgency of a busy night shift."

# Notes
- **Edge Cases**: If the scenario is abstract or lacks detail, infer reasonable visual elements to create a coherent prompt.
- **Cultural Sensitivity**: Be mindful of cultural nuances and avoid stereotypes or biased representations.
- **No NSFW Content**: Double-check to ensure the prompt adheres to safety guidelines and does not contain any inappropriate content.`.trim();

  if (typeof caseStudy.scenario !== "string" || !caseStudy.scenario.trim())
    throw new Error("Invalid scenario provided to generateImagePrompt.");

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization : `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model    : "gpt-4o-mini",
      messages : [
        { role: "system", content: META_PROMPT },
        { role: "user",   content: "Scenario:\n" + caseStudy.scenario },
      ],
      temperature: 0.0,
      max_tokens : 500,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error("OpenAI API Error:", err);
    throw new Error(err.error?.message || "Unknown error");
  }

  const data = await response.json();
  const generatedPrompt = data.choices[0]?.message?.content;
  if (!generatedPrompt) throw new Error("No prompt generated by OpenAI.");

  return { ...caseStudy, prompt: generatedPrompt };
}

/* -------------------------------------------------------------------------- */
/* fetchImagesForCaseStudies  (unchanged)                                     */
/* -------------------------------------------------------------------------- */
async function fetchImagesForCaseStudies(
  caseStudies,
  model = "sd3-large",
  aspect_ratio = "1:1"
) {
  try {
    const outputs = await Promise.all(
      caseStudies.map(async (cs) => {
        if (!cs.imagePrompt) {
          console.warn(`No image prompt for ${cs.caseStudy}`);
          return { ...cs, imageUrl: null };
        }

        const payload = {
          prompt: cs.imagePrompt,
          output_format: "jpeg",
          model,
          aspect_ratio,
          width : 356,
          height: 356,
        };

        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));

        const res = await axios.post(
          "https://api.stability.ai/v2beta/stable-image/generate/sd3",
          formData,
          {
            validateStatus: undefined,
            responseType : "arraybuffer",
            headers      : {
              Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
              Accept       : "image/*",
            },
          }
        );

        if (res.status === 200) {
          const base64 = Buffer.from(res.data).toString("base64");
          return { ...cs, imageUrl: `data:image/jpeg;base64,${base64}` };
        }

        console.warn(`Image gen failed for ${cs.caseStudy} – status ${res.status}`);
        return { ...cs, imageUrl: null };
      })
    );
    return outputs;
  } catch (err) {
    console.error("Error in fetchImagesForCaseStudies:", err.message);
    throw err;
  }
}


/* -------------------------------------------------------------------------- */
/*  app/api/route.js                                                          */
/* -------------------------------------------------------------------------- */

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
  const META_PROMPT = `Use the medical case study text from ${retrievedCasesText}, to write 4 similar medical case studies (250 words) ... (entire original prompt stays here)`;  // keep full text

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
