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
      baseURL: 'https://ar1a501wbp49s725.us-east-1.aws.endpoints.huggingface.cloud/v1/',
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
  model = 'sd3-large-turbo',
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
}
