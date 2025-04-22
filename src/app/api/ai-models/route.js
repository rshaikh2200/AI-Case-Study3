import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Instantiate OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -----------------------------------------------------------------------------
// NEW HELPER: Repair malformed JSON output from the model
// -----------------------------------------------------------------------------
function fixInvalidCaseStudiesJson(jsonString) {
  // Merge trailing "caseStudy", "scenario", "questions" keys into preceding object
  let fixed = jsonString
    .replace(/\},\s*"caseStudy":/g, ',"caseStudy":')
    .replace(/\],\s*\{/g, ',{')
    .replace(/\},\s*\{(?=\s*"department":)/g, '},{');
  return fixed;
}

// -------------------------
// NEW FUNCTION: Google Search API integration
// -------------------------
async function getMedicalCaseStudiesFromGoogle() {
  try {
    const searchTerm = "Case Studies";
    const searchDepth = 50;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId = process.env.GOOGLE_CSE_ID;

    if (!googleApiKey || !googleCseId) {
      throw new Error("Google API key or Custom Search Engine ID not configured.");
    }

    const serviceUrl = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      q: searchTerm,
      key: googleApiKey,
      cx: googleCseId,
      num: searchDepth,
      siteSearch: 'https://psnet.ahrq.gov/webmm-case-studies'
    };

    const response = await axios.get(serviceUrl, { params });
    const results = response.data;

    let combinedResultsText = "";
    if (results && results.items && results.items.length > 0) {
      results.items.forEach((item) => {
        combinedResultsText += `Source: ${item.link} - ${item.snippet}\n`;
      });
    } else {
      combinedResultsText = "No Google search results found for medical error case studies.";
    }
    return combinedResultsText;
  } catch (error) {
    console.error("Error in getMedicalCaseStudiesFromGoogle:", error.message);
    return "Error retrieving Google search results.";
  }
}

// -------------------------
// Existing parsing functions
// -------------------------
function parseCaseStudies(responseText) {
  try {
    let jsonString = '';
    const fenceMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      jsonString = fenceMatch[1];
    } else {
      const objMatch = responseText.match(/{[\s\S]*}/);
      jsonString = objMatch ? objMatch[0] : responseText;
    }

    jsonString = fixInvalidCaseStudiesJson(jsonString);
    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions)) {
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      }
      cs.questions.forEach((q, qIdx) => {
        if (!q.question || !q.options || Object.keys(q.options).length !== 4) {
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
        }
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      caseStudy: `Case Study ${index + 1}`,
      scenario: cs.scenario,
      questions: cs.questions.map((q) => ({
        question: q.question,
        options: Object.entries(q.options).map(([key, label]) => ({ key, label })),
      })),
    }));
  } catch (error) {
    console.error('Error parsing JSON response:', error.message);
    console.error('Received Response:', responseText);
    throw new Error('Failed to parse case studies JSON. Ensure the model outputs valid JSON.');
  }
}

function parseCaseStudiesWithAnswers(responseText) {
  try {
    let jsonString = '';
    const fenceMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      jsonString = fenceMatch[1];
    } else {
      const objMatch = responseText.match(/{[\s\S]*}/);
      jsonString = objMatch ? objMatch[0] : responseText;
    }

    jsonString = fixInvalidCaseStudiesJson(jsonString);
    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions)) {
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      }
      cs.questions.forEach((q, qIdx) => {
        if (
          !q.question ||
          !q.options ||
          Object.keys(q.options).length !== 4 ||
          !q['correct answer'] ||
          !q['Hint']
        ) {
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
        }
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      department: cs.department,
      role: cs.role,
      specialization: cs.specialization,
      caseStudy: `Case Study ${index + 1}`,
      scenario: cs.scenario,
      questions: cs.questions.map((q) => ({
        question: q.question,
        options: Object.entries(q.options).map(([key, label]) => ({ key, label })),
        correctAnswer: q['correct answer'],
        hint: q['Hint'],
      })),
    }));
  } catch (error) {
    console.error('Error parsing JSON response with answers:', error.message);
    console.error('Received Response:', responseText);
    throw new Error('Failed to parse case studies JSON with correct answers. Ensure the model outputs valid JSON.');
  }
}

export async function POST(request) {
  // Retrieve the API keys and environment variables
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;        // for embeddings
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;
  const HF_API_KEY = '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'; // for HF text generation

  // Initialize Pinecone
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index('coachcarellm').namespace('( Default )');

  // Extract request body
  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization};;`;

  // Create an embedding for the input query using OpenAI
  let queryEmbedding;
  try {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    queryEmbedding = embeddingRes.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to create embedding for the query.' },
      { status: 500 }
    );
  }

  // Query Pinecone for similar case studies
  let similarCaseStudies = [];
  try {
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK: 500,
      includeMetadata: true,
    });
    similarCaseStudies = pineconeResponse.matches.map(
      (match) => match.metadata.content
    );
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve similar case studies from Pinecone.' },
      { status: 500 }
    );
  }

  // Retrieve additional case studies from Google Search API
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();

  // Combine retrieved texts
  const retrievedCasesText = similarCaseStudies.join('\n');

  // Construct the meta prompt (keep EXACT instructions)
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
        - Question 1: Focuses on Colleague Feedback
        - Question 2: Focuses on Team Evaluation
        - Question 3: Focuses on Risk Intervention
    
      **Case Study 2:**
        - Question 1: Focuses on Validattion and Assessment
        - Question 2: Focuses on SAFE (Stop-Assess-Focus-Engage)
        - Question 3: Focuses on Interuption Free Zone
    
      **Case Study 3:**
        - Question 1: Focuses on Effective Free Zone
        - Question 2: Focuses on Clear Communications
        - Question 3: Focuses on CARE (Communicate-Acknowledge-Repeat-Evaluate)
    
      **Case Study 4:**
        - Question 1: Focuses on Clarify Information
        - Question 2: Focuses on CARE (Communicate-Acknowledge-Repeat-Evaluate)
        - Question 3: Focuses on SAFE (Stop-Assess-Focus-Engage)
    
    - **Use the following 10 Safety Behaviors and Definitions:**
    
        a. Colleague Feedback
            Definition: Ask your colleagues to review your work and offer assistance in reviewing the work of others. 
    
        b. Team Evaluation
            Definition: Reflect on what went well with team , what didn't, how to improve, and who will follow through. All team members should freely speak up. A debrief typically lasts only 3 minutes.
      
        c. Risk Intervention
            Definition: Ask a question to gently prompt the other person of potential safety issue, Request a change to make sure the person is fully aware of the risk. Voice a Concern if the person is resistant. Use the Chain of command if the possibility of patient harm persists.
    
        d. Validation Assessment
            Definition: An internal Check (Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?). Verify (check with an independent qualified source).
    
        e. SAFE (Stop-Assess-Focus-Engage)
            Definition: Stop (pause for 2 seconds to focus on task at hand), Assess (consider action you're about to take), Focus (concentrate and carry out the task), Engage (check to make sure the task was done right and you got the right result).
    
        f. Interuption Free Zone
            Definition: 1) Avoid interrupting others while they are performing critical tasks 2) Avoid distractions while completing critical tasks: Use phrases like "Stand by" or "Hold on".
    
        g. Effective Care Transtitions
            Definition: Six important principles that make an Effective Care Transitions: Standardized and streamlined, Distraction-Free Environment, Face-to-face/bedside (interactive), Acknowledgments/repeat backs, Verbal with written/ printed information, Opportunity for questions/clarification.
        
        h. CARE (Communicate-Acknowledge-Repeat-Evaluate)
             Definition: 1) Sender communicates information to receiver, 2) receiver listens or writes down the information and reads/repeats it back as written or heard to the sender. 3) Sender then acknowledges the accuracy of the read-back by stating "that's correct". If not correct the sender repeats/clarifies the communication beginning the three steps again.
    
        i. Clear Communications
             Definition: Consists of using clear letters and numbers in communication such as replacing fifteen with one-five, and using phonetic alphabet letters instead of Latin alphabet.
        
        j. Clarifying Information
           Definition: Requesting Additional information, and expressing concerns to avoid misunderstandings.
    
      
    
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
        /* Removed the inline comment:
           // Repeat for Case Study 2, 3, and 4
           to avoid invalid JSON */
      ]
    }
    \`\`\`
    
    Ensure that:
    
    - The JSON is **well-formatted** and **free of any syntax errors**.
    - There are **no comments** (e.g., lines starting with //), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.`;


  try {
    // ——— MODIFIED: Use Hugging Face endpoint via OpenAI JS client ———
    const caseClient = new OpenAI({
      baseURL: 'https://yjjtfpf4yx44n4tt.us-east-1.aws.endpoints.huggingface.cloud/v1/',
      apiKey: HF_API_KEY,
    });
    const completion = await caseClient.chat.completions.create({
      model: 'tgi',
      messages: [{ role: 'user', content: META_PROMPT }],
      stream: false,
      max_tokens: 8192,
      temperature: 0.5,
    });
    const rawResponseText = completion.choices[0].message.content;
    console.log('Raw Model Output:', rawResponseText);
    const aiResponse = rawResponseText;
    // ——— End modification ———

    // Save raw model output to JSON file
    try {
      const tmpDirectory = '/tmp/case studies json';
      if (!fs.existsSync(tmpDirectory)) {
        fs.mkdirSync(tmpDirectory, { recursive: true });
      }
      const fileName = `case-studies-${Date.now()}.json`;
      const tmpFilePath = path.join(tmpDirectory, fileName);
      const dataToSave = {
        date: new Date().toISOString(),
        department,
        role,
        care,
        specialization,
        rawModelOutput: aiResponse
      };
      fs.writeFileSync(tmpFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      const appDirectory = path.join(process.cwd(), 'src', 'app');
      if (!fs.existsSync(appDirectory)) {
        fs.mkdirSync(appDirectory, { recursive: true });
      }
      const finalFilePath = path.join(appDirectory, fileName);
      fs.copyFileSync(tmpFilePath, finalFilePath);
      console.log(`✅ JSON file written to: ${finalFilePath}`);
    } catch (err) {
      console.error('❌ Error saving JSON file:', err);
    }

    // Parse responses
    const parsedCaseStudies = parseCaseStudies(aiResponse);
    const parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);
    console.log('Parsed Model Output:', parsedCaseStudiesWithAnswers);

    return NextResponse.json({
      caseStudies: parsedCaseStudiesWithAnswers,
      aiResponse: parsedCaseStudiesWithAnswers,
    });
  } catch (error) {
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
