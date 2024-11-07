import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export const dynamic = 'force-dynamic';


// Existing parsing function to extract and validate case studies without correct answers
function parseCaseStudies(responseText) {
  try {
    let jsonString = '';

    // Attempt to parse JSON from code fences
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Attempt to parse the entire response as JSON
      jsonString = responseText;
    }

    // Remove comments (lines starting with //)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');

    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    // Parse the cleaned JSON string
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Further validation
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

    // Transform into desired format
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

// Modified parsing function to extract and include correct answers and hints
function parseCaseStudiesWithAnswers(responseText) {
  try {
    let jsonString = '';

    // Attempt to parse JSON from code fences
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Attempt to parse the entire response as JSON
      jsonString = responseText;
    }

    // Remove comments (lines starting with //)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');

    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    // Parse the cleaned JSON string
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Further validation
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

    // Transform into desired format including correct answers and hints
    return parsed.caseStudies.map((cs, index) => ({
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
  // Retrieve the API keys and environment variables from environment
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;

  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
  const index = pc.Index('rag-riz').namespace('ns1'); // Ensure 'rag' is your index name and 'ns1' is your namespace

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  // Extract request body
  const { department, role, specialization, userType } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization}`;

  // Create an embedding for the input query
  let queryEmbedding;
  try {
    const embeddingResponse = await openai.embeddings.create({
      input: query,
      model: 'text-embedding-ada-002',
    });

    if (
      !embeddingResponse.data ||
      !Array.isArray(embeddingResponse.data) ||
      embeddingResponse.data.length === 0
    ) {
      throw new Error('Invalid embedding data structure.');
    }

    queryEmbedding = embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
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
      topK: 3,
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

  // Construct the prompt with retrieved case studies
  const retrievedCasesText = similarCaseStudies.join('\n');

  let META_PROMPT;

  if (userType === 'clinical') {
    META_PROMPT = `Please generate 4 medical case studies, each approximately 150 words, featuring a scenario for a ${role} in the ${department} department specializing in ${specialization}. Use the following ${retrievedCasesText} to help generate detailed and descriptive medical case studies. Each case study should:

Include a different medical error that occurred by the ${role} or by the team.
Incorporate characters with diverse ethnicity names, and genders. For each character specify their pronouns in parentheses, use diverse pronouns. (don't provide the ethnicity)
The medical studies should be detailed and focus on the situation, medical error, and consequences.
The case study should use different styles of narrating such as including emotions between characters, describe the environment, include different medical employees, and be more descriptive. Use formal and English.
Do not include the steps taken to resolve the issue; focus solely on presenting the scenario.
For each case study, create 3 unique multiple-choice questions that:

Have 4 option choices each.
Provide the correct answer choice and answer for each question.
In the question include specific key words hints based on the correct answer choice, utilizing the definition of the relevant error prevention tool to assist the user.
The question should be strictly from the perspective of the ${role}.
Each question should strictly focus on a different error prevention approach and how it could have been applied to prevent the error in the case study. Ensure the questions explore different approaches.
Include clues by using buzzwords or synonyms from the correct answer's definition.
Do not explicitly mention the prevention tools by name in the question header.
Error Prevention Tools and Definitions:

a. Peer Checking and Coaching

Definition: Ask your colleagues to review your work and offer assistance in reviewing the work of others.
b. Debrief

Definition: Reflect on what went well, what didn't, how to improve, and who will follow through.
c. ARCC

Definition: Ask a question, Request a change, voice Concern if needed, Stop the line, and activate the Chain of command.
d. Validate and Verify

Definition: Double-check information and confirm accuracy before proceeding.
e. STAR

Definition: Stop, Think, Act, Review.
f. No Distraction Zone

Definition: Eliminate interruptions and focus fully on the task at hand.
g. Effective Handoffs

Definition: Ensure clear and complete communication during transitions in care.
h. Read and Repeat Backs; Request and Give Acknowledgement

Definition: Repeat information back to confirm understanding and acknowledge receipt.
i. Ask Clarifying Questions

Definition: Inquire further to eliminate ambiguities and ensure clarity.
j. Using Alphanumeric Language

Definition: Use letters and numbers together to prevent miscommunication (e.g., saying "M as in Mike").
k. SBAR

Definition: Situation, Background, Assessment, Recommendation.
    Ensure the following format is strictly followed and output the entire response as valid JSON.

\`\`\`json
{
  "caseStudies": [
    {
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
          }
            correct answer: question 1 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        },
        {
          "question": "Question 2 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
            correct answer: question 2 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        },
        {
          "question": "Question 3 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
            correct answer: question 3 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        }
      ]
    }
    // Repeat for Case Study 2, 3, and 4
  ]
}
\`\`\`

**Example:**

\`\`\`json
{
  "caseStudies": [
    {
      "caseStudy": "Case Study 1",
      "scenario": ": "Dr. Patel (he/him), an orthopedic surgeon, was finishing up a knee replacement surgery when the patient’s implant arrived. In the rush to keep things on schedule, he quickly began installing it without double-checking the lot number. Minutes later, the scrub nurse noticed the implant package didn't match the patient’s chart. Dr. Patel’s colleague, Dr. Lin (she/her), was nearby and always emphasized the importance of a final check before any major step."
      "questions": [
        {
          "question": "Dr. Patel could have avoided this mix-up by practicing which Error Prevention Tool, which focuses on verifying actions with a double-check or comparison?"
          "options": {
            "A": "Peer Checking and Coaching",
            "B": "Debrief",
            "C": "ARCC",
            "D": "Validate and Verify"
          }
            correct answer: C) Validate and Verify
            "Hint": "Double-checking and confirming accuracy before proceeding."
        },
        {
          "question": "If Dr. Patel would have stopped the line to address concerns immediately, which Error Prevention Tool that focus on stopping and adressing concern would he be applying ",
          "options": {
            "A": "STAR",
            "B": "No Distraction Zone",
            "C": "ARCC",
            "D": "Effective Handoffs"
          }
            correct answer: C) ARCC
            "Hint": "Voice concern and activate chain of command."
        },
        {
          "question": "After the surgery, Dr. Patel and his team discussed ways to prevent future errors. This reflection represents which Error Prevention Tool, designed to identify improvements and assign follow-up actions?",
          "options": {
            "A": "ARCC",
            "B": "Debrief",
            "C": "No Distraction Zone",
            "D": "Read and Repeat Backs"
          }
            correct answer: B) Debrief 
            "Hint": "What went well and areas for improvement."
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
  } else if (userType === 'non-clinical') {
    // New prompt for non-clinical roles
    META_PROMPT = `Please generate 4 non-clinical medical case studies, each approximately 150 words, featuring a scenario for a ${role} in the ${department} department. Each case study should:

Include a different non-clinical communication error that occurred by the ${role} or by the team.
Incorporate characters with diverse ethnicity names, and genders. For each character specify their pronouns in parentheses, use diverse pronouns. (don't provide the ethnicity)
The medical studies should be detailed and focus on the situation, communication error, and consequences.
The case study should use different styles of narrating such as including emotions between characters, describe the environment, include a mix of non-clinical employees, and be more descriptive. Use formal and English.
Do not include the steps taken to resolve the issue; focus solely on presenting the scenario.
For each case study, create 3 unique multiple-choice questions that:

Have 4 option choices each.
Provide the correct answer choice and answer for each question.
In the question include specific key words hints based on the correct answer choice, utilizing the definition of the relevant error prevention tool to assist the user.
The question should be strictly from the perspective of the ${role}.
Each question should strictly focus on a different error prevention approach and how it could have been applied to prevent the error in the case study. Ensure the questions explore different approaches.
Include clues by using buzzwords or synonyms from the correct answer's definition.
Do not explicitly mention the prevention tools by name in the question header.
Error Prevention Tools and Definitions:

a. Peer Checking and Coaching

Definition: Ask your colleagues to review your work and offer assistance in reviewing the work of others.
b. Debrief

Definition: Reflect on what went well, what didn't, how to improve, and who will follow through.
c. ARCC

Definition: Ask a question, Request a change, voice Concern if needed, Stop the line, and activate the Chain of command.
d. Validate and Verify

Definition: Double-check information and confirm accuracy before proceeding.
e. STAR

Definition: Stop, Think, Act, Review.
f. No Distraction Zone

Definition: Eliminate interruptions and focus fully on the task at hand.
g. Effective Handoffs

Definition: Ensure clear and complete communication during transitions in care.
h. Read and Repeat Backs; Request and Give Acknowledgement

Definition: Repeat information back to confirm understanding and acknowledge receipt.
i. Ask Clarifying Questions

Definition: Inquire further to eliminate ambiguities and ensure clarity.
j. Using Alphanumeric Language

Definition: Use letters and numbers together to prevent miscommunication (e.g., saying "M as in Mike").
k. SBAR

Definition: Situation, Background, Assessment, Recommendation.
    Ensure the following format is strictly followed and output the entire response as valid JSON.

\`\`\`json
{
  "caseStudies": [
    {
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
          }
            correct answer: question 1 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        },
        {
          "question": "Question 2 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
            correct answer: question 2 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        },
        {
          "question": "Question 3 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
            correct answer: question 3 correct answer choice and answer
            Hint: definition of error prevention tool corresponding to correct answer choice
        }
      ]
    }
    // Repeat for Case Study 2, 3, and 4
  ]
}
\`\`\`

**Example:**

\`\`\`json
{
  "caseStudies": [
    {
      "caseStudy": "Case Study 1",
      "scenario": "Susan was updating the intranet home page with a long and detailed safety alert that needed to go out immediately based on a safety event that had recently occurred at one of the system’s hospitals. She was rushing between tasks and quickly published the page for all 50,000 employees. Moments later, she got an angry email from the system Chief Medical Officer informing her that she got the part number wrong and that this was causing staff to place orders on the wrong product. Her cubicle neighbor Mike was an excellent proofreader and was always happy to assist his coworker when asked.",
      "questions": [
        {
          "question": "Susan could have prevented potential harm to patients by practicing which of the following Error Prevention Tools?",
          "options": {
            "A": "Peer Check/ Peer Coach",
            "B": "Debrief",
            "C": "ARCC",
            "D": "Validate and Verify"
          },
          correct answer: A) Peer Check/ Peer Coach
          "Hint": "Double-checking and confirming accuracy before proceeding."
        },
        {
          "question": "How could Mike have assisted Susan to prevent the error?",
          "options": {
            "A": "By taking over her tasks",
            "B": "By proofreading the safety alert before publication",
            "C": "By informing the Chief Medical Officer",
            "D": "By delaying the publication"
          },
          correct answer: B) By proofreading the safety alert before publication
          "Hint": "Utilizing proofreading as a method to catch errors."
        },
        {
          "question": "What is the primary benefit of having a Peer Coach in a high-stakes environment?",
          "options": {
            "A": "Increases workload",
            "B": "Provides emotional support",
            "C": "Enhances error detection and prevention",
            "D": "Reduces the need for management oversight"
          },
          correct answer: C) Enhances error detection and prevention
          "hint": "Focuses on minimizing mistakes through collaboration."
        }
      ]
    },
    {
      "caseStudy": "Case Study 2",
      "scenario": "The communications department head (Mary) held a weekly meeting with her direct reports. This meeting often started late and often ran over. The meeting did not include an agenda and the attendees were not sure what or how they should prepare in advance. Mary often observed that surgeons who are often very competitive about perfecting their craft would take a moment at the end of surgery procedures to ask their staff 3 questions: what went well, how do we improve, and how do we get there. At the following meeting, Mary decided to incorporate this best practice.",
      "questions": [
        {
          "question": "Mary and the surgeon are using which of the Error Prevention Tools?",
          "options": {
            "A": "Peer Check/ Peer Coach",
            "B": "Debrief",
            "C": "ARCC",
            "D": "Validate and Verify"
          },
          correct answer: B) Debrief
          "Hint": "What went well and areas for improvement."
        },
        {
          "question": "What was the main issue with Mary's original meetings?",
          "options": {
            "A": "Too many attendees",
            "B": "Lack of structure and clarity",
            "C": "Inadequate technology",
            "D": "Insufficient time allocation"
          },
          correct answer: B) Lack of structure and clarity
          "Hint": "Meetings lacked agenda and preparation guidance."
        },
        {
          "question": "By incorporating debriefing techniques, Mary aims to improve meetings by:",
          "options": {
            "A": "Increasing meeting frequency",
            "B": "Enhancing communication and continuous improvement",
            "C": "Reducing the number of topics discussed",
            "D": "Extending meeting durations"
          },
          correct answer: B) Enhancing communication and continuous improvement
          "Hint": "Focuses on reflecting and improving processes."
        }
      ]
    },
    {
      "caseStudy": "Case Study 3",
      "scenario": "Paul was a senior member of the communications department and very politically active. His political party was pressuring him to use his access to the 50,000 plus employees to send out political advertisements right before the election. Paul was hesitant about abusing his power and reach but proceeded anyway. Tony (Paul’s Boss) had to fire Tony for this action. “If you would have escalated this to me Tony, I could have reminded you about how we as a nonprofit cannot endorse candidates.” Tony was hesitant but did not voice his concern up to his superior.",
      "questions": [
        {
          "question": "Tony could have relied on which of the following Error Prevention Tools to guide him in this tough situation?",
          "options": {
            "A": "STAR",
            "B": "No Distraction Zone",
            "C": "ARCC",
            "D": "Effective Handoffs"
          },
          correct answer: C) ARCC
          "Hint": "Voice concern and activate chain of command."
        },
        {
          "question": "What does ARCC stand for in the context of error prevention?",
          "options": {
            "A": "Ask, Report, Correct, Confirm",
            "B": "Anticipate, React, Communicate, Control",
            "C": "Alert, Raise, Consult, Change",
            "D": "Assess, Respond, Coordinate, Communicate"
          },
          correct answer: A) Ask, Report, Correct, Confirm
          "Hint": "Steps involved in addressing and escalating concerns."
        },
        {
          "question": "What was the consequence of Tony not using the ARCC tool?",
          "options": {
            "A": "He was promoted",
            "B": "He successfully sent the advertisements",
            "C": "He was fired for not escalating the issue",
            "D": "Nothing happened"
          },
          correct answer: C) He was fired for not escalating the issue
          "Hint": "Failure to follow proper escalation procedures led to negative outcomes."
        }
      ]
    },
    {
      "caseStudy": "Case Study 4",
      "scenario": "Tina was trying to send out a mass communication regarding an upcoming directors and above meeting. She was asked to send a “save the date” on Monday for the event on Friday. Tina got it backwards and ended up sending it on Friday for the event on Monday. Tina knows that whenever numbers and especially dates are involved to always double check. Tina could have prevented this error by using which of the following Error prevention tools.",
      "questions": [
        {
          "question": "Tina could have prevented this error by using which of the following Error prevention tools?",
          "options": {
            "A": "Peer Check/ Peer Coach",
            "B": "Debrief",
            "C": "Validate and Verify",
            "D": "ARCC"
          },
          correct answer: C) Validate and Verify
          "Hint": "Double-checking and confirming accuracy before proceeding."
        },
        {
          "question": "What specific action should Tina have taken to avoid the date mix-up?",
          "options": {
            "A": "Ask a coworker to review the dates",
            "B": "Use a calendar tool to verify dates",
            "C": "Validate the dates before sending",
            "D": "All of the above"
          },
          correct answer: D) All of the above
          "Hint": "Multiple validation steps can prevent errors."
        },
        {
          "question": "Why is it important to validate and verify information in communications?",
          "options": {
            "A": "To ensure accuracy and reliability",
            "B": "To increase workload",
            "C": "To delay communication",
            "D": "To reduce the need for proofreading"
          },
          correct answer: A) To ensure accuracy and reliability
          "Hint": "Maintaining trust through accurate information dissemination."
        }
      ]
    }
    // Add additional case studies here following the same structure...
  ]
}

\`\`\`

Ensure that:

- The JSON is **well-formatted** and **free of any syntax errors**.
- There are **no comments** (e.g., lines starting with \`//\`), **no trailing commas**, and **no additional text** outside the JSON block.
- The JSON is enclosed within \`\`\`json and \`\`\` code fences.

Do not include any additional text outside of the JSON structure.`;
  }

  try {
    // Make a request to OpenAI's Chat Completion API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: META_PROMPT,
        },
      ],
      temperature: 0.0,
      max_tokens: 6000,
      stream: false,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices returned from OpenAI.');
    }

    const aiResponse = response.choices[0].message.content;

    if (!aiResponse) {
      throw new Error('No content returned from OpenAI.');
    }

    console.log('Raw Model Output:', aiResponse);

    // Parse the AI response using the existing function (without correct answers)
    const parsedCaseStudies = parseCaseStudies(aiResponse);

    // Parse the AI response using the new function (including correct answers and hints)
    const parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);

    console.log('Parsed Model Output:', parsedCaseStudiesWithAnswers);

    return NextResponse.json({
      caseStudies: parsedCaseStudies,
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

