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
  - The case study should include diverse names from aisa, europe, africa, south america, antartica, europe, and austrilia. 
  - The case study should only include the scenario and the primary active failure that occured.
  - The case studies should not mention country names, staff origins.
  - Keep the case studies short and concise, and do not mention c the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any safety behaviors. 
  - For all case studies, make sure the clinical scenario are clincally accurate and reflect real world practices.


- **For each case study, create 3 unique multiple-choice questions that:**
  - Are different for each case study and correspond exactly to the specified error prevention tool focus—do not repeat question text or options across case studies.
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

  - **Strictly follow the Question Structure Below and make sure the options choices matchs the correct error prevention tool focused in the question:**
      - **Question Structure**
      
        **Case Study 1:**
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
    - There are **no comments** (e.g., lines starting with \`//\`), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.
    
    **Ensure that:**
    
    - Each **Error Prevention Tool** is used **exactly once** across all case studies and questions.
    - **No repetition** of the same **Error Prevention Tool** occurs within the same case study or across different case studies.
    - All **case studies** are **unique** and focus on **distinct Error Prevention Tools**.
    - The **Question Structure** is strictly followed to ensure consistency and adherence to the specified guidelines.
    
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
              "question": "Whcich EPT practice that involves verifying with a qualified internal source, could have helped Dr. Patel avoid this mix up?",
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
              "question": "If Dr. Patel would have stopped the line to address concerns immediately, which Error Prevention Tool that focuses on stopping and addressing concerns would he be applying?",
              "options": {
                "A": "STAR",
                "B": "No Distraction Zone",
                "C": "ARCC",
                "D": "Effective Handoffs"
              },
              "correct answer": "C) ARCC",
              "Hint": "Ask a question to gently prompt the other person of potential safety issue"
            },
            {
              "question": "If Dr.Patel, along with the team, had taken a moment after surgery to reflext on the day's task, and discuss what went well or what didn't, whihc EPT practice would they applied?",
              "options": {
                "A": "ARCC",
                "B": "Debrief",
                "C": "No Distraction Zone",
                "D": "Read and Repeat Back"
              },
              "correct answer": "B) Debrief",
              "Hint": "3 minute discussion focusing on what went well and areas for improvement."
            }
          ]
        }
        // Additional case studies...
      ]
    }
    \`\`\`
    
    Ensure that:
    
    - The JSON is **well-formatted** and **free of any syntax errors**.
    - There are **no comments** (e.g., lines starting with \`//\`), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.`;


  try {
    // Call Runpod's synchronous run endpoint directly using axios.
    const runpodUrl = 'https://api.runpod.ai/v2/dqu7topnjpvpaz/run';
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      throw new Error('Missing RUNPOD_API_KEY environment variable');
    }

    const rpResp = await axios.post(
      runpodUrl,
      { input: { prompt: META_PROMPT } },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${runpodApiKey}`,
        },
      }
    );

    let respData = rpResp.data;

    // If Runpod returns an id and a non-final status (e.g., IN_QUEUE), poll for completion.
    const runId = respData && respData.id;
    const isFinal = (d) => d && (d.status === 'COMPLETED' || d.status === 'SUCCEEDED' || d.status === 'FINISHED' || d.status === 'FAILED');

    if (runId && !isFinal(respData)) {
      const maxMs = 120000; // 2 minutes
      const intervalMs = 3000; // 3s
      const start = Date.now();

      // Prepare candidate endpoints to poll. Try the runsync/id path first, then the base path with id.
      const pollEndpoints = [
        `${runpodUrl}/${runId}`,
        `${runpodUrl.replace('/runsync', '')}/${runId}`,
        `https://api.runpod.ai/v2/${runId}`,
      ];

      let finished = false;
      let lastErr = null;

      while (Date.now() - start < maxMs && !finished) {
        for (const ep of pollEndpoints) {
          try {
            const pollResp = await axios.get(ep, {
              headers: { Authorization: `Bearer ${runpodApiKey}` },
              timeout: 15000,
            });
            respData = pollResp.data;
            if (isFinal(respData)) {
              finished = true;
              break;
            }
          } catch (e) {
            lastErr = e;
            // try next endpoint
          }
        }

        if (!finished) {
          await new Promise((res) => setTimeout(res, intervalMs));
        }
      }

      if (!finished) {
        console.error('Runpod polling timed out', { runId, lastErr });
        return NextResponse.json(
          { error: 'Runpod job did not finish in time', runId, status: respData?.status || 'UNKNOWN' },
          { status: 202 }
        );
      }
    }

    // Try to locate the model-generated text inside common Runpod response shapes.
    function findStringWithBraces(obj) {
      if (obj == null) return null;
      if (typeof obj === 'string') {
        if (obj.includes('{') && obj.includes('}')) return obj;
        return null;
      }
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found = findStringWithBraces(el);
          if (found) return found;
        }
      } else if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          const found = findStringWithBraces(obj[k]);
          if (found) return found;
        }
      }
      return null;
    }

    // Common Runpod output fields: respData.output, respData.output_text, respData.output[0].generated_text, etc.
    let rawResponseText =
      (respData && respData.output && Array.isArray(respData.output) && respData.output.map(o => (typeof o === 'string' ? o : JSON.stringify(o))).join('\n')) ||
      respData.output_text ||
      (respData.output && respData.output[0] && (respData.output[0].generated_text || respData.output[0].content || respData.output[0].text)) ||
      findStringWithBraces(respData) ||
      JSON.stringify(respData);

    // If rawResponseText is an object stringified and contains escaped newlines, unescape to make parsing easier
    if (typeof rawResponseText === 'string') {
      rawResponseText = rawResponseText.replace(/\\n/g, '\n');
    }

    const parsedCaseStudies = parseCaseStudies(rawResponseText);
    const parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(rawResponseText);

    return NextResponse.json({
      caseStudies: parsedCaseStudiesWithAnswers,
      aiResponse: parsedCaseStudiesWithAnswers,
    });
  } catch (error) {
    console.error('Unexpected Error:', error);
    // If the error is an axios HTTP error, surface status and data to help debugging
    if (error && error.response) {
      const { status, data } = error.response;
      return NextResponse.json(
        { error: `Runpod request failed with status ${status}`, details: data },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

