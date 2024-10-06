import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

dotenv.config({ path: '.env.local' });

const client = new BedrockAgentRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sanitize input to prevent problematic content
const sanitizeInput = (text = '') => {
  const restrictedWords = ['forbiddenWord1', 'forbiddenWord2'];
  return restrictedWords.reduce((acc, word) => acc.replace(new RegExp(word, 'gi'), '***'), text);
};

// Sanitize the scenario for safe image generation (specific to Case Study 3)
function sanitizeScenario(scenario) {
  const restrictedWords = [
    'error', 'failure', 'death', 'harm', 'mistake', 'accident', 'complication', 'malpractice', 'wrong action', 'fatal'
  ];
  let sanitizedScenario = scenario;

  // Replace problematic words with neutral terms
  restrictedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitizedScenario = sanitizedScenario.replace(regex, 'issue');
  });

  // Additional replacements for specific phrases
  sanitizedScenario = sanitizedScenario.replace(/(severe pain|irreversible damage|long-term disability|failed to recognize|muscle and nerve damage)/gi, 
  'discomfort, functional issues, delayed diagnosis, and long-term functional limitations');

  console.log('Sanitized Scenario:', sanitizedScenario);  // Log the sanitized version

  return sanitizedScenario;
}

export async function POST(request) {
  try {
    const { department = 'General Department', role = 'General Role', specialization = 'General Specialization' } = await request.json();

    const sanitizedDepartment = sanitizeInput(department);
    const sanitizedRole = sanitizeInput(role);
    const sanitizedSpecialization = sanitizeInput(specialization);
=
    const message = `Please generate 4 medical case studies (120-200 words) and include 3 multiple-choice questions for each case study:
      - A medical case study for a ${sanitizedRole} in the ${sanitizedDepartment} department specializing in ${sanitizedSpecialization}.
      - Create 3 case study based unique multiple-choice questions for each case study with 4 options. The questions should be based on the error prevention tools, safety behaviors and how they could have been used to prevent the error in the case study.`;

    const input = {
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "8JNS4T4ALI",
          modelArn: "anthropic.claude-3-haiku-20240307-v1:0",
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
              overrideSearchType: "SEMANTIC",
            },
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: `Please use the following information:\n$search_results$\n${message}`,
              basePromptTemplate: `Here is the case studies, error prevention tools, CHAMP safety behaviors. Grady safety behaviors :\n$search_results$\n${message}`,
              inferenceConfig: {
                textInferenceConfig: {
                  temperature: 0.5,
                  topP: 0.8,
                  maxTokens: 2048,
                },
              },
            },
          },
        },
      },
    };

    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);

    console.log("Model Response:", response);

    if (!response?.output?.text) {
      throw new Error('No valid text found in the model response.');
    }

    const caseStudies = parseCaseStudies(response.output.text);

    if (caseStudies.length === 0) {
      throw new Error('Failed to parse case studies, scenarios, or questions from the response.');
    }

    console.log("Case studies parsed successfully. Now generating images...");

    const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudies);

    return NextResponse.json({ caseStudies: caseStudiesWithImages });

  } catch (err) {
    console.error('Error invoking RetrieveAndGenerateCommand:', err.message || err);
    return NextResponse.json({
      error: `Failed to fetch case studies: ${err.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}

// Parse case studies and questions from the model response
function parseCaseStudies(responseText) {
  const caseStudies = [];
  const caseStudyBlocks = responseText.split(/Case Study \d+:/g).filter(Boolean);

  caseStudyBlocks.forEach((block, index) => {
    let [scenario, ...questionsBlock] = block.split('Questions:').map(section => section.trim());

    scenario = scenario
      .replace(/^[^\n]+\n/, '')
      .replace(/\nMultiple Choice Questions:\n/, '')
      .replace(/Specialization: [^\n]+\n/g, '')
      .replace(/Case Summary:/, '')
      .replace(/Multiple-Choice Questions:/, '') 
      .trim();

    const questions = parseQuestions(questionsBlock.join('Questions:'));

    caseStudies.push({
      caseStudy: `Case Study ${index + 1}`,
      scenario: scenario.trim(),
      questions: questions,
    });
  });

  return caseStudies;
}

// Parse questions from the text block
function parseQuestions(text) {
  if (!text) return [];

  const questionBlocks = text.split(/\n\n/).filter(block => block.trim());
  return questionBlocks.slice(0, 3).map((block) => {
    const lines = block.split('\n').filter(line => line.trim());

    const question = lines[0].replace(/^\d+\.\s*/, '').trim();

    const options = lines.slice(1, 5).map((line, index) => ({
      key: String.fromCharCode(65 + index), 
      label: line.trim(),
    }));

    return { question, options };
  });
}

// Generate images for each case study
async function fetchImagesForCaseStudies(caseStudies) {
  return await Promise.all(
    caseStudies.map(async (caseStudy) => {
      try {
        const sanitizedScenario = sanitizeScenario(caseStudy.scenario);

        const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: sanitizedScenario,
            size: "1024x1024",
            n: 1,
          }),
        });

        const imageData = await openAiResponse.json();

        if (!openAiResponse.ok) {
          console.warn(`Failed to generate image for Case Study: ${caseStudy.caseStudy}. Error: ${imageData.error?.message || 'Unknown error'}`);
          return { ...caseStudy, imageUrl: null };
        }

        return { ...caseStudy, imageUrl: imageData.data[0]?.url };
      } catch (error) {
        console.error('Error generating image:', error.message);
        return { ...caseStudy, imageUrl: null };
      }
    })
  );
}

