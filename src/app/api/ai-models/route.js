import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
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
    // Robustly extract the JSON block between the first { and the last }
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    let jsonString = responseText.slice(firstBrace, lastBrace + 1);

    // Remove code fences and extraneous backticks
    jsonString = jsonString.replace(/```json|```/g, '');

    // Normalize whitespace/newlines that may break JSON
    jsonString = jsonString.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ');

    // Remove trailing commas before } or ]
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    // Replace smart quotes with straight quotes
    jsonString = jsonString.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    // Attempt to parse
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('Primary JSON.parse failed, attempting relaxed fixes', parseErr.message);
      // Try escaping unescaped quotes inside Hint fields
      jsonString = jsonString.replace(/"Hint"\s*:\s*"([^\"]*?)"/g, (_m, txt) => {
        return `"Hint": "${txt.replace(/"/g, '\\"')}"`;
      });
      // Retry parse
      parsed = JSON.parse(jsonString);
    }

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Normalize and validate each case study but be tolerant of minor variations
    const normalized = parsed.caseStudies.map((cs, idx) => {
      const item = { ...cs };

      // Some models incorrectly put the scenario text in `caseStudy` instead of `scenario`.
      if ((!item.scenario || item.scenario === '') && item.caseStudy && item.caseStudy.length > 80) {
        item.scenario = item.caseStudy;
        item.caseStudy = `Case Study ${idx + 1}`;
      }

      // Ensure questions is an array
      if (!Array.isArray(item.questions)) {
        item.questions = [];
      }

      // Normalize question option structures
      item.questions = item.questions.map((q) => {
        const question = { ...q };
        // Some outputs may supply options as an object or as an array
        if (question.options && !Array.isArray(question.options) && typeof question.options === 'object') {
          question.options = Object.entries(question.options).map(([k, v]) => ({ key: k, label: v }));
        } else if (Array.isArray(question.options)) {
          // convert array to key/label pairs (A,B,C,D)
          const letters = ['A', 'B', 'C', 'D'];
          question.options = question.options.map((opt, i) => ({ key: letters[i] || String(i), label: opt }));
        } else {
          question.options = [];
        }

        return question;
      });

      return item;
    });

    // Return simplified structure used by the frontend
    return normalized.map((cs, index) => ({
      caseStudy: `Case Study ${index + 1}`,
      scenario: cs.scenario || cs.caseStudy || '',
      questions: cs.questions.map((q) => ({
        question: q.question || q.prompt || '',
        options: (q.options || []).map((o) => ({ key: o.key || o.label?.[0] || '', label: o.label || '' })),
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
    // Extract JSON block robustly
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    let jsonString = responseText.slice(firstBrace, lastBrace + 1);

    jsonString = jsonString.replace(/```json|```/g, '').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
    jsonString = jsonString.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseErr) {
      // Try escaping quotes in Hint fields then reparse
      jsonString = jsonString.replace(/"Hint"\s*:\s*"([^\"]*?)"/g, (_m, txt) => `"Hint": "${txt.replace(/"/g, '\\"')}"`);
      parsed = JSON.parse(jsonString);
    }

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Normalize each case study
    return parsed.caseStudies.map((cs, index) => {
      const item = { ...cs };
      if ((!item.scenario || item.scenario === '') && item.caseStudy && item.caseStudy.length > 80) {
        item.scenario = item.caseStudy;
        item.caseStudy = `Case Study ${index + 1}`;
      }

      item.questions = Array.isArray(item.questions) ? item.questions : [];

      const questions = item.questions.map((q) => {
        const question = { ...q };

        // Normalize options: object -> array of {key,label}
        if (question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
          question.options = Object.entries(question.options).map(([k, v]) => ({ key: k, label: v }));
        } else if (Array.isArray(question.options)) {
          const letters = ['A', 'B', 'C', 'D'];
          question.options = question.options.map((opt, i) => ({ key: letters[i] || String(i), label: opt }));
        } else {
          question.options = [];
        }

        const correctAnswer = question['correct answer'] || question.correctAnswer || '';
        const hint = question.Hint || question.hint || '';

        return {
          question: question.question || '',
          options: question.options.map((o) => ({ key: o.key, label: o.label })),
          correctAnswer,
          hint,
        };
      });

      return {
        department: item.department || '',
        role: item.role || '',
        specialization: item.specialization || '',
        caseStudy: `Case Study ${index + 1}`,
        scenario: item.scenario || '',
        questions,
      };
    });
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
  const META_PROMPT = `Here are real world example medical case studies which includes a primary active failures that has occured: ${retrievedCasesText}. , write 4 similar medical case studies (250 words each) that are tailored towards a ${role} specializing in ${specialization} working in the ${department} department and  includes a  primary active failure, without compromising the clinical integrity.  
countries of origin or unnecessary backstories.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case study should include diverse names and genders for the patient, and staff involved.
  - **IMPORTANT: When referring to staff members by their role, ALWAYS use the format "Name, a [Role]" (e.g., "Erica, a Medical Assistant" or "Dr. Smith, a Surgeon"). Never refer to staff as just "Medical Assistant" or "the Medical Assistant" - always include their name first, followed by their role.**
  - The case study should only include the scenario and the primary active failure that occured.
  - The case studies should not mention country names, staff origins.
  - Keep the case studies short and concise, and do not mention  the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any safety behaviors. 
  - For all case studies, make sure the clinical scenario are clincally accurate and reflect real world practices.
  - The case studies should not specific state the primary active failures and any followup procedure or evaluation. 
  - The primary active failure for each case study should be unique and clinically accurate
  
  
 - ** Each Case Study should strictly focus on the following only 2 accurate blood pressure reading technique each and follow the structure below strictly:
       -Case Study 1: Ask Patient to use bathroom when rooming full bladder adds 10 mm hg &  Uncross legs crossed legs add 2-8 mm hg
       -Case Study 2: Support black and legs unsupported back and legs add 6.5 hg & Abstain from conversation talking or active listening adds 10 mm hg
       -Case Study 3: Place cuff on bare arm cuff over clothing adds 5-50 mm hg & Correct size cuff  to small of a cuff adds 2-10 mm hg
       -Case Study 4:  Position arm supported at heart level unsupported arm adds 10 mm hg


- **For each case study, create 3 unique multiple-choice questions that:**
  - Are different for each case study and correspond exactly to the specified error prevention tool focus—do not repeat question text or options across case studies.
  - Team Evaluation is a group effort and is done towards the completion of procedure; questions should not imply an individual debrief.
  - **IMPORTANT: The question should address staff members by their actual name (e.g., "Erica" or "Dr. Smith"), NOT by their role (e.g., "Medical Assistant" or "the Medical Assistant"). Always use the format "Name, a [Role]" when first introducing them, then refer to them by name only in subsequent references.**
  - Provide the correct answer choice and answer in the format:  
    \`correct answer: C) Validate and Verify\`
  - Provide the hint in the format:  
    \`Hint: Double-checking and confirming accuracy before proceeding.\`
  - In the question include specific keywords or buzzwords based on the correct answer choice’s definition; do not name the safety behavior in the question.
  - Each question should strictly focus on the assigned safety behavior and how it could have been applied to prevent the error.
  - Questions should be asked and address from the perspective of the role. Here is a example:   
    “If Dr. Patel would have stopped the line to address concerns immediately, which Safety Behavior that focuses on stopping and addressing concerns would he be applying”

  - **Strictly follow the Question Structure Below and make sure the options choices matchs the correct error prevention tool focused in the question:**
      - **Question Structure**
      
        **Case Study 1:**
        - Multiple Choice Question 1: Focuses on Peer Checking and Coaching
        - Fill in the Blank Question 2: Focuses on Debrief
        - True or False Question 3: Focuses on ARCC
    
        **Case Study 2:**
        -  Fill in the Blank Question 1: Focuses on Validate and Verify
        - Multiple Choice Question 2: Focuses on STAR
        -  True or False Question 3: Focuses on No Distraction Zone
    
        **Case Study 3:**
        - True or False Question 1: Focuses on Effective Handoffs
        - Fill in the Blank Question 2:Focuses on Read and Repeat Back
        - Multiple Choice Question 3: Focuses on Ask Clarifying Questions
    
        **Case Study 4:**
        -  Multiple Choice Question 1: Focuses on Alphanumeric Language
        -  Multiple Choice Question 2: Focuses on SBAR
        - Fill in the Blank Question 3: Focuses on STAR

  - **CRITICAL: True or False Question Format - MUST FOLLOW THIS EXACT STRUCTURE:**
    - True/False questions MUST be worded in the following format:
      "If [Staff Name] had applied the [specific the error prevention tool] method, it could have prevented [the specific error that occurred]."
    - Then provide options: "A) True" and "B) False"
    - Example: "If the Orthopedic Surgeon Dr. Brent had paused briefly before taking the patient's blood pressure to focus on proper positioning and whether the patient had used the restroom before, it could have prevented the inaccurate reading. Dr. Bent would be applying the STAR method to prevent the error. "
    - DO NOT use formats like: "The Medical Assistant did not ensure... This could have been prevented by... This behavior is known as: a) true b) false"
    - Always use the "If [Name] had [action]... it could have prevented [error]" format, then state the error prevention practice name, then ask True/False
    
    - **Use the following 11 Error Prevention Tools and Definitions:**
    
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
              "question": "Multiple choice question text that focuses on error prevention practice.",
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
              "question": "Fill in the blank Question text that focuses on error prevention practice.",
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
              "question": "True or False Question text that focuses on error prevention practice.",
              "options": {
                "A": "Option A",
                "B": "Option B",
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

     **Ensure that:**
    
    - Each **Error Prevention Tool** is used **exactly once** across all case studies and questions.
    - **No repetition** of the same **Error Prevention Tool** occurs within the same case study or across different case studies.
    - All **case studies** are **unique** and focus on **distinct Error Prevention Tools**.
    - The **Question Structure** is strictly followed to ensure consistency and adherence to the specified guidelines.

    ** Use the following examples for case study and questions as reference for how to structure and format the case studies and questions **
    
    **Example:**
    
    \`\`\`json
    {
      },
        "department" : "Operating Room",
        "role" : "Surgeon",
        "specialization": "General Surgery"
        "care": "inpatient"
    },
      "caseStudies": [
        {
          "caseStudy": "Case Study 1",
          "scenario": "Mr. Nitesh Patel, a 65 year old patient underwent a total knee replacement surgery for severe osteoarthritis. During the procedure, Brent Keeling a respected orthopedic surgeon noted difficulty in exposing the joint due to significant scarring from the patient's previous knee surgeries. Towards the end of the procedure, the patient complained of numbness and weakness in the foot. Postoperative imaging revealed a stretch injury to the common personeal nerve.",
          "questions": [
            {
              "question": "Which error prevention practice that involves verifying with a qualified internal source, could have helped Dr. Patel avoid this mix up?",
              "options": {
                "A": "Peer Checking and Coaching",
                "B": "Debrief",
                "C": "ARCC",
                "D": "Validate and Verify"
              },
              "correct answer": "D) Validate and Verify",
              "Hint": "Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?"
            },
            {
              "question": "Before documenting an elevated blood pressure and notifying the provider, Dr.Brent should have taken an extra moment to double-check the reading against expected standards. This step is an example of stopping to __ information before acting. ",
              "options": {
                "A": "Debrief",
                "B": "Validate and Verify",
                "C": "Peer Check",
                "D": "Ask Clarifying Questions"
              },
              "correct answer": "C) ARCC",
              "Hint": "Ask a question to gently prompt the other person of potential safety issue"
            },
            {
              "question": "If the Orthopedic Surgeon Dr. Brent had paused briefly before taking the patient's blood pressure to focus on proper positioning and whether the patient had used the restroom before, it could have prevented the inaccurate reading. Dr. Bent would be applying the STAR method to prevent the error.",
              "options": {
                "A": "True",
                "B": "False",
              },
              "correct answer": "A) True",
              "Hint": "Pause and Refocus."
            }
             {
          "caseStudy": "Case Study 2",
          "scenario": "Mr. Nitesh Patel, a 65 year old patient underwent a total knee replacement surgery for severe osteoarthritis. During the procedure, Brent Keeling a respected orthopedic surgeon noted difficulty in exposing the joint due to significant scarring from the patient's previous knee surgeries. Towards the end of the procedure, the patient complained of numbness and weakness in the foot. Postoperative imaging revealed a stretch injury to the common personeal nerve.",
          "questions": [
            {
              "question": "Which error prevention practice that involves verifying with a qualified internal source, could have helped Dr. Patel avoid this mix up?",
              "options": {
                "A": "Peer Checking and Coaching",
                "B": "Debrief",
                "C": "ARCC",
                "D": "Validate and Verify"
              },
              "correct answer": "D) Validate and Verify",
              "Hint": "Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?"
            },
            {
              "question": "Before documenting an elevated blood pressure and notifying the provider, Dr.Brent should have taken an extra moment to double-check the reading against expected standards. This step is an example of stopping to __ information before acting. ",
              "options": {
                "A": "Debrief",
                "B": "Validate and Verify",
                "C": "Peer Check",
                "D": "Ask Clarifying Questions"
              },
              "correct answer": "C) ARCC",
              "Hint": "Ask a question to gently prompt the other person of potential safety issue"
            },
            {
              "question": "If the Orthopedic Surgeon Dr. Brent had paused briefly before taking the patient's blood pressure to focus on proper positioning and whether the patient had used the restroom before, it could have prevented the inaccurate reading. Dr. Bent would be applying the STAR method to prevent the error.",
              "options": {
                "A": "True",
                "B": "False",
              },
              "correct answer": "B) True",
              "Hint": "Pause and Refocus."
            }
             {
          "caseStudy": "Case Study 3",
          "scenario": "Mr. Nitesh Patel, a 65 year old patient underwent a total knee replacement surgery for severe osteoarthritis. During the procedure, Brent Keeling a respected orthopedic surgeon noted difficulty in exposing the joint due to significant scarring from the patient's previous knee surgeries. Towards the end of the procedure, the patient complained of numbness and weakness in the foot. Postoperative imaging revealed a stretch injury to the common personeal nerve.",
          "questions": [
            {
              "question": "Which error prevention practice that involves verifying with a qualified internal source, could have helped Dr. Patel avoid this mix up?",
              "options": {
                "A": "Peer Checking and Coaching",
                "B": "Debrief",
                "C": "ARCC",
                "D": "Validate and Verify"
              },
              "correct answer": "D) Validate and Verify",
              "Hint": "Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?"
            },
            {
              "question": "Before documenting an elevated blood pressure and notifying the provider, Dr.Brent should have taken an extra moment to double-check the reading against expected standards. This step is an example of stopping to __ information before acting. ",
              "options": {
                "A": "Debrief",
                "B": "Validate and Verify",
                "C": "Peer Check",
                "D": "Ask Clarifying Questions"
              },
              "correct answer": "C) ARCC",
              "Hint": "Ask a question to gently prompt the other person of potential safety issue"
            },
            {
              "question": "If the Orthopedic Surgeon Dr. Brent had paused briefly before taking the patient's blood pressure to focus on proper positioning and whether the patient had used the restroom before, it could have prevented the inaccurate reading. Dr. Bent would be applying the STAR method to prevent the error.",
              "options": {
                "A": "True",
                "B": "False",
              },
              "correct answer": "B) True",
              "Hint": "Pause and Refocus."
            }
             {
          "caseStudy": "Case Study 4",
          "scenario": "Mr. Nitesh Patel, a 65 year old patient underwent a total knee replacement surgery for severe osteoarthritis. During the procedure, Brent Keeling a respected orthopedic surgeon noted difficulty in exposing the joint due to significant scarring from the patient's previous knee surgeries. Towards the end of the procedure, the patient complained of numbness and weakness in the foot. Postoperative imaging revealed a stretch injury to the common personeal nerve.",
          "questions": [
            {
              "question": "Which error prevention practice that involves verifying with a qualified internal source, could have helped Dr. Patel avoid this mix up?",
              "options": {
                "A": "Peer Checking and Coaching",
                "B": "Debrief",
                "C": "ARCC",
                "D": "Validate and Verify"
              },
              "correct answer": "D) Validate and Verify",
              "Hint": "Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?"
            },
            {
              "question": "Before documenting an elevated blood pressure and notifying the provider, Dr.Brent should have taken an extra moment to double-check the reading against expected standards. This step is an example of stopping to __ information before acting. ",
              "options": {
                "A": "Debrief",
                "B": "Validate and Verify",
                "C": "Peer Check",
                "D": "Ask Clarifying Questions"
              },
              "correct answer": "C) ARCC",
              "Hint": "Ask a question to gently prompt the other person of potential safety issue"
            },
            {
              "question": "If the Orthopedic Surgeon Dr. Brent had paused briefly before taking the patient's blood pressure to focus on proper positioning and whether the patient had used the restroom before, it could have prevented the inaccurate reading. Dr. Bent would be applying the STAR method to prevent the error.",
              "options": {
                "A": "True",
                "B": "False",
              },
              "correct answer": "B) True",
              "Hint": "Pause and Refocus."
            }
          ]
        }
      ]
    }
    \`\`\`
    
    Ensure that:
    
    - The JSON is **well-formatted** and **free of any syntax errors**.
    - There are **no comments** (e.g., lines starting with \`//\`), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.`;


  try {
    const caseClient = new OpenAI({
      baseURL: 'https://fm8vizgo0fsaunlm.us-east-2.aws.endpoints.huggingface.cloud/v1/',
      apiKey: process.env.HF_API_KEY,
    });
    const completion = await caseClient.chat.completions.create({
      model: 'rshaikh22/Qwen3_30B_Instruct_CQA_Medical',
      messages: [
        { role: 'system', content: 'You are only a strict JSON format text generator. Do not ask any clarifying questions or provide any additional commentary. Respond only with valid text and strictly follow JSON format provided in the user’s prompt.' },
        { role: 'user',   content: META_PROMPT }
      ],
      temperature: 0.0
    });
    const rawResponseText = completion.choices[0].message.content;


    const parsedCaseStudies = parseCaseStudies(rawResponseText);
    const parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(rawResponseText);

    const parsedCaseStudiesFormatted = parsedCaseStudiesWithAnswers.map(cs => ({
      caseStudy: cs.caseStudy,
      scenario: cs.scenario,
      questions: cs.questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        hint: q.hint,
      })),
      role: cs.role,
      department: cs.department,
      specialization: cs.specialization,
    }));
    
    return NextResponse.json({
      caseStudies: parsedCaseStudiesFormatted,
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
