import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import axios from 'axios';
import FormData from 'form-data';

// -------------------------
// NEW FUNCTION: Google Search API integration for Medical Error Case Studies
// -------------------------
async function getMedicalCaseStudiesFromGoogle() {
  try {
    // Set your search parameters here – adjust the query and search_depth as needed.
    const searchTerm = "Case Studies";
    const searchDepth = 10;
    const maxResults = 100;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId = process.env.GOOGLE_CSE_ID;
    if (!googleApiKey || !googleCseId) {
      throw new Error("Google API key or Custom Search Engine ID not configured.");
    }
    
    // Construct the request URL and parameters
    const serviceUrl = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      q: searchTerm,
      key: googleApiKey,
      cx: googleCseId,
      num: searchDepth,
      siteSearch: 'https://psnet.ahrq.gov/webmm-case-studies'
      // Optionally, add a site filter if you wish to target a specific website:
      // siteSearch: 'jointcommission.org'
    };

    // Call the Google Search API
    const response = await axios.get(serviceUrl, { params });
    const results = response.data;
    
    let combinedResultsText = "";
    if (results && results.items && results.items.length > 0) {
      results.items.forEach((item) => {
        // Combine the link and snippet from each result
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
// Existing functions (unchanged)
// -------------------------
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
      department: cs.department,          // Added department
      role: cs.role,                      // Added role
      specialization: cs.specialization,  // Added specialization
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
  const index = pc.Index('rag-riz').namespace('ns1'); // Ensure 'rag-riz' is your index name and 'ns1' is your namespace

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  // Extract request body
  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization}, Care: ${care};`;

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

  // NEW: Retrieve additional case studies scenarios from Google Search API
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();

  // Combine the Pinecone results and Google search results into one text block
  const retrievedCasesText = similarCaseStudies.join('\n') + "\n" + googleResultsText;

  // Construct the meta prompt with retrieved case studies and Google search results
  const META_PROMPT = `
Extract medical case study text from ${retrievedCasesText} and search open source hospital incident reports 
The Joint Commission datasets for medical case scenarios with medical errors that is relevant and direct 
for a ${care} ${role} specializing in ${specialization}, and working in the ${department}.

${
  department === "Stroke Center"
    ? `Since the department is a Stroke Center, the sumarized 150-word case studies should focus on stroke cases
       and potential medical errors. Make sure to provide measurements (E.g. 100 Mg) when needed. Ensure the medical case studies incorporate a variety of  medical errors errors when dealing with a stroke patient while maintaining clinical integrity. Keep the case studies short and concise and do not mention countries name or where a patient is from. Also do not state team assessment or review of situation, or the imporantnace of steps to solve the issue. Also do not include incident reviews, analysis.
       The case studies shouild not includes this sentence or anything similae: Ex: The error was directly linked to failure in communicating critical timing and dose details among staff. The incident underscores that even with standard protocols, a lapse in teamwork and internal checks can lead to medication mismanagement and the neglect of continuous vital monitoring during stroke treatment.
       The case study should only include the scenario and what went wrong in the case study, and the case study should be limited to 5 sentences and 200 words.
       The case studies should not include any countries name or which country a patient or employee is from (ex: Maria from America,  Dr. O'Malley from Europe). `
    : ""
}

After retrieving the relevant scenarios, write 4 similar but distinct medical case studies in 150 words 
each, without compromising the clinical integrity of the scenarios. Each case study should only include 
the scenario and the medical error that occurred.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case studies shouild not includes this sentence or anything similae: Ex: The error was directly linked to failure in communicating critical timing and dose details among staff. The incident underscores that even with standard protocols, a lapse in teamwork and internal checks can lead to medication mismanagement and the neglect of continuous vital monitoring during stroke treatment.
  - The case study should only include the scenario and what went wrong in the case study, and the case study should be limited to 5 sentences and 250 words.
  - The case studies should not include any countries name or which country a patient or employee is from (ex: Maria from America,  Dr. O'Malley from Europe). 
  - Use unique patient and medical staff names from various continents (America, Canada, South America, 
    Europe, Asia, Australia) to reflect global diversity.
  - The summarized case study content should be modified to have different names of procedures, 
    medications, and specialities. However, do not change the clinical integrity of the scenario.
  - If the scenario states medical dosage, specify the quantity with proper units.
    
    
    
    - **For each case study, create 3 unique multiple-choice questions that:**
      - Have 4 option choices each.
      - Debrief is typically a group effort the question should no reflect debrief being done by a single individual.
      - Provide the correct answer choice and answer in the format: correct answer: C) Validate and Verify
      - Provide the hint in the format: Hint: Double-checking and confirming accuracy before proceeding.
      - In the question include specific key words hints based on the correct answer choice, utilizing the definition of the relevant error prevention tool to assist the user. The error prevention tool name should not be included in the question.
      - Each question should strictly focus on the assigned Error Prevention Tool and how it could have been applied to prevent the error in the case study.
      - Include clues by using buzzwords or synonyms from the correct answer's definition.
      - Do not explicitly mention the prevention tools by name in the question header.
      - The question should be straight forward, and conise, do not state any buzzwords in the question itself (e.g. using buzzwords like check and validate?)
      - The question should address directly to ${role} and include the name of ${role} from the scenario and not include words, like wish . 
      - Thw question should be written similarly to this example: If Dr. Patel would have stopped the line to address concerns immediately, which Error Prevention Tool that focuses on stopping and addressing concerns would he be applying) 
      
    
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
    const response = await openai.chat.completions.create({
      model: "o3-mini",
      reasoning_effort: "low",
      temperature: 1.0,
      messages: [
        {
          role: "user",
          content: META_PROMPT,
        },
      ],
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
    let parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);

    console.log('Parsed Model Output:', parsedCaseStudiesWithAnswers);

    // Now, generate image prompts for each case study
    try {
      // For each case study, generate an image prompt
      const caseStudiesWithImagePrompts = await Promise.all(
        parsedCaseStudiesWithAnswers.map(async (caseStudy) => {
          const { prompt } = await generateImagePrompt(caseStudy);
          return {
            ...caseStudy,
            imagePrompt: prompt,
          };
        })
      );

      // Now, fetch images for case studies
      const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudiesWithImagePrompts);

      // Update parsedCaseStudiesWithAnswers with images
      parsedCaseStudiesWithAnswers = caseStudiesWithImages;

      // Also update parsedCaseStudies (the one without correct answers), if needed
      // For simplicity, let's update parsedCaseStudies similarly
      const parsedCaseStudiesWithImages = parsedCaseStudiesWithAnswers.map(cs => ({
        caseStudy: cs.caseStudy,
        scenario: cs.scenario,
        questions: cs.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,  // Correctly access the property
          hint: q.hint,                    // Correctly access the property
        })),
        imageUrl: cs.imageUrl,  // Include the image URL if it's available
        role: cs.role,
        department: cs.department,
        specialization: cs.specialization,
      }));
      

      return NextResponse.json({
        caseStudies: parsedCaseStudiesWithImages,
        aiResponse: parsedCaseStudiesWithAnswers,
      });
      
      

    } catch (error) {
      console.error('Error generating images:', error);
      return NextResponse.json(
        { error: 'Failed to generate images for case studies.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Function to generate image prompt via OpenAI
async function generateImagePrompt(caseStudy) {
  const META_PROMPT = `
You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation based on given scenarios. Your prompts should be clear, vivid, and free of any NSFW (Not Safe For Work) content. Ensure that the prompts are suitable for use with image generation models and accurately reflect the provided scenario.

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
5. **Ensure the image does not looked animated, cartoon, and look realistict.

# Output Format

- **Format**: Plain text paragraph.
- **Length**: Approximately 40 - 60 words, providing sufficient detail without being overly verbose.
- **Style**: Descriptive and clear, suitable for feeding directly into an image generation model.

# Example

**Image Prompt**:
"A bustling hospital emergency room at night, illuminated by bright overhead lights. Doctors and nurses in white coats move swiftly between beds, attending to patients with focused expressions. A tall doctor stands next to a small examination table, while a nurse adjusts a monitor on the adjacent wall. Medical equipment and monitors line the walls, and the atmosphere is tense yet organized, reflecting the urgency of a busy night shift."

# Notes

- **Edge Cases**: If the scenario is abstract or lacks detail, infer reasonable visual elements to create a coherent prompt.
- **Cultural Sensitivity**: Be mindful of cultural nuances and avoid stereotypes or biased representations.
- **No NSFW Content**: Double-check to ensure the prompt adheres to safety guidelines and does not contain any inappropriate content.
`.trim();
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.');
  }

  // Validate the scenario
  if (typeof caseStudy.scenario !== 'string' || caseStudy.scenario.trim() === '') {
    throw new Error('Invalid scenario provided to generateImagePrompt.');
  }

  // Call the OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: META_PROMPT,
        },
        {
          role: 'user',
          content: 'Scenario:\n' + caseStudy.scenario,
        },
      ],
      temperature: 0.0,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API Error:', errorData);
    throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const generatedPrompt = data.choices[0]?.message?.content;

  if (!generatedPrompt) {
    throw new Error('No prompt generated by OpenAI.');
  }

  return { 
    ...caseStudy,
    prompt: generatedPrompt 
  };
}

async function fetchImagesForCaseStudies(
  caseStudies,
  model = 'sd3-large',
  aspect_ratio = '1:1'
) {
  try {
    const responses = await Promise.all(
      caseStudies.map(async (caseStudy) => {
        try {
          if (!caseStudy.imagePrompt) {
            console.warn(`No image prompt for ${caseStudy.caseStudy}. Skipping image generation.`);
            return { ...caseStudy, imageUrl: null };
          }

          const generatedPrompt = caseStudy.imagePrompt;

          const payload = {
            prompt: generatedPrompt,
            output_format: 'jpeg',
            model,
            aspect_ratio,
            width: 356,
            height: 356,
          };

          const formData = new FormData();
          Object.keys(payload).forEach((key) =>
            formData.append(key, payload[key])
          );

          const response = await axios.post(
            `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
            formData,
            {
              validateStatus: undefined,
              responseType: 'arraybuffer',
              headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`, // Secure your API key in environment variables
                Accept: 'image/*',
              },
            }
          );

          if (response.status === 200) {
            const base64Image = Buffer.from(response.data).toString('base64');
            return {
              ...caseStudy,
              imageUrl: `data:image/jpeg;base64,${base64Image}`,
            };
          } else {
            console.warn(
              `Failed to generate image for ${caseStudy.caseStudy}. Status: ${response.status}`,
              response.data
            );
            return { ...caseStudy, imageUrl: null };
          }
        } catch (error) {
          if (error.response) {
            console.error('Stability API Error:', error.response.status, error.response.data);
          } else if (error.request) {
            console.error('No response received from Stability API:', error.request);
          } else {
            console.error('Error generating image:', error.message);
          }
          return { ...caseStudy, imageUrl: null };
        }
      })
    );

    return responses;
  } catch (error) {
    console.error('Error in fetchImagesForCaseStudies:', error.message);
    throw error;
  }
}
