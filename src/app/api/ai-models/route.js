import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Instantiate OpenAI client for embeddings (unchanged)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts and parses case studies JSON from a raw response string.
 */
function parseCaseStudies(responseText) {
  try {
    // 1) Extract the first JSON object in the response
    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('No JSON object found in response');
    }
    let jsonString = match[0];

    jsonString = jsonString
    // Remove code fences if present
    .replace(/```json/g, '')
    .replace(/```/g, '')
    // Fix unescaped quotes
    .replace(/(?<!")\\"/g, '\\\\"') // Escape unescaped quotes
    // Remove trailing commas
    .replace(/,\s*([}\]])/g, '$1')

    // 3) Escape any unescaped double quotes inside Hint values
    jsonString = jsonString.replace(
      /"Hint":\s*"([\s\S]*?)"/g,
      (_match, hintText) => {
        const escaped = hintText.replace(/"/g, '\\"');
        return `"Hint": "${escaped}"`;
      }
    );

    // 4) Parse cleaned JSON string
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // 5) Validate structure of each case study
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

    // 6) Return only the necessary fields
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

/**
 * Similar to parseCaseStudies, but also returns correct answers and hints.
 */
function parseCaseStudiesWithAnswers(responseText) {
  try {
    // 1) Extract JSON
    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('No JSON object found in response');
    }
    let jsonString = match[0];

    // 2) Clean up trailing commas
    

    // 3) Escape unescaped quotes inside hints
    jsonString = jsonString.replace(
      /"Hint":\s*"([\s\S]*?)"/g,
      (_match, hintText) => {
        const escaped = hintText.replace(/"/g, '\\"');
        return `"Hint": "${escaped}"`;
      }
    );

    // 4) Parse
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // 5) Validate each entry
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

    // 6) Return structured data
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

/**
 * API POST handler (rest of your code unchanged)
 */
export async function POST(request) {
  // Retrieve environment variables
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;
  const HF_API_KEY = process.env.HF_API_KEY;

  // Initialize Pinecone
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index('coachcarellm').namespace('( Default )');

  // Extract request body
  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization}`;

  // Create an embedding for the input query
  let queryEmbedding;
  try {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    queryEmbedding = embeddingRes.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding with OpenAI:', error);
    return NextResponse.json({ error: 'Failed to create embedding.' }, { status: 500 });
  }

  // Query Pinecone for similar case studies
  let similarCaseStudies = [];
  try {
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK: 500,
      includeMetadata: true,
    });
    similarCaseStudies = pineconeResponse.matches.map((m) => m.metadata.content);
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json({ error: 'Failed to retrieve case studies.' }, { status: 500 });
  }

  // —— ADDED: define retrievedCasesText so template interpolation works —— 
  const retrievedCasesText = similarCaseStudies.join('\n');

  // Meta prompt (fences & examples removed so this template literal no longer breaks)
  const META_PROMPT = `Here are real world of medical case studies that include primary active failures that occured: ${retrievedCasesText}. , to write 4 similar medical case studies (250 words) that are tailored towards a ${role} specializing in ${specialization} working in the ${department} department and that includes a similar primary active failure that occured in the ${retrievedCasesText}, without compromising the clinical integrity. Remove extraneous information such as providers’ 
countries of origin or unnecessary backstories.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case study should only include the scenario and the primary active failure that occured.
  - The case studies should not mention country names, staff origins.
  - Use unique patient and medical staff names from various continents (America, Canada, South America, 
    Europe, Asia, Australia) to reflect global diversity.
  - The case study should include proper age for the patients. 
  - The case study should define medication with quantity with proper units, and proper names without changing the clinical integrity from source  ${retrievedCasesText} case study.
  - Keep the case studies short and concise, and do not mention countries by name or the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any safety behaviors and how they the situation lacked the EPT which could have avoided the error.
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
  - Are different for each case study and correspond exactly to the specified safety behavior focus—do not repeat question text or options across case studies.
  - Have 4 option choices each.
  - Team Evaluation is a group effort and is done towards the completion of procedure; questions should not imply an individual debrief.
  - Provide the correct answer choice and answer in the format:  
    \`correct answer: C) Validate and Verify\`
  - Provide the hint in the format:  
    \`Hint: Double-checking and confirming accuracy before proceeding.\`
  - In the question include specific keywords or buzzwords based on the correct answer choice’s definition; do not name the safety behavior in the question.
  - Each question should strictly focus on the assigned safety behavior and how it could have been applied to prevent the error.
  - Questions should address ${role} directly in this form:  
    “If Dr. Patel would have stopped the line to address concerns immediately, which Safety Behavior that focuses on stopping and addressing concerns would he be applying”

- **Strictly follow the Question Structure Below and ensure the options match the correct safety behaviors:**

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
               "question": "Question 1 text that focuses on colleage feedback safey behavior",
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
               "question": "Question 2 text that focuses on team evaluation safety behavior",
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
               "question": "Question 3 text that focuses on risk intervention safety behavior",
               "options": {
                 "A": "Option A",
                 "B": "Option B",
                 "C": "Option C",
                 "D": "Option D"
               },
               "correct answer": "A) correct answer ",
               "Hint": "1 sentence sumarized definition of correct answer choice."
             }
           "caseStudy": "Case Study 2",
           "scenario": "Description of the case study scenario.",
           "questions": [
             {
               "question": "Question 1 text that focuses on validation assessment safey behavior",
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
               "question": "Question 2 text that focuses on SAFE (Stop-Assess-Focus-Evaluate) safety behavior",
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
               "question": "Question 3 text that focuses on Interuption Free Zone safety behavior",
               "options": {
                 "A": "Option A",
                 "B": "Option B",
                 "C": "Option C",
                 "D": "Option D"
               },
               "correct answer": "A) correct answer ",
               "Hint": "1 sentence sumarized definition of correct answer choice."
             }
           "caseStudy": "Case Study 3",
           "scenario": "Description of the case study scenario.",
           "questions": [
             {
               "question": "Question 1 text that focuses on effective care transitions safey behavior",
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
               "question": "Question 2 text that focuses on clear communications safety behavior",
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
               "question": "Question 3 text that focuses on CARE (Communicate-Acknowledge-Repeat-Evaluate) safety behavior",
               "options": {
                 "A": "Option A",
                 "B": "Option B",
                 "C": "Option C",
                 "D": "Option D"
               },
               "correct answer": "A) correct answer ",
               "Hint": "1 sentence sumarized definition of correct answer choice."
             }
               "caseStudy": "Case Study 4",
           "scenario": "Description of the case study scenario.",
           "questions": [
             {
               "question": "Question 1 text that focuses on clarifying informations safey behavior",
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
               "question": "Question 2 text that focuses on CARE (Communicate-Acknowledge-Repeat-Evaluate) safety behavior",
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
               "question": "Question 3 text that focuses on SAFE (Stop-Assess-Focus-Engage) safety behavior",
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
       ]
     }
   
     \`\`\`
     
     Ensure that:
     
     - The JSON is **well-formatted** and **free of any syntax errors**.
     - There are **no comments** (e.g., lines starting with //), **no trailing commas**, and **no additional text** outside the JSON block.
     - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
     
     Do not include any additional text outside of the JSON structure.`;

  try {
    const caseClient = new OpenAI({
      baseURL: 'https://kzhygs15r8ecrupx.us-east-1.aws.endpoints.huggingface.cloud',
      apiKey: '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',
    });
    const completion = await caseClient.chat.completions.create({
      model: 'tgi',
      messages: [
        { role: 'system', content: 'You are strictly a JSON only text generator. Do not ask any clarifying questions or provide any additional commentary. Respond only with valid text and strictly follow the JSON format matching the user’s prompt.' },
        { role: 'user',   content: META_PROMPT }
      ],
      stream: false,
      max_tokens: 8192,
      temperature: 0.0,
    });
    const rawResponseText = completion.choices[0].message.content;

    // Save raw output (unchanged)
    // ... file saving logic ...

    // Parse
    const parsedCaseStudies = parseCaseStudies(rawResponseText);
    const parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(rawResponseText);

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
