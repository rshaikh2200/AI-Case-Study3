
// Initialize OpenAI Configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Instantiate OpenAIApi with the configuration
const ai = new OpenAIApi(configuration);

// Define the text-to-speech function
async function text2Speech({ 
  res, 
  onSuccess, 
  onError, 
  model = "tts-1", 
  voice = "alloy", 
  input, 
  speed = 1 
}) {
  try {
    const response = await ai.audio.speech.create({
      model,
      voice,
      input,
      response_format: 'mp3',
      speed
    });

    const readableStream = response.body;
    readableStream.pipe(res);

    let bufferStore = Buffer.from([]);

    readableStream.on('data', (chunk) => {
      bufferStore = Buffer.concat([bufferStore, chunk]);
    });
    readableStream.on('end', () => {
      onSuccess({ model, buffer: bufferStore });
    });
    readableStream.on('error', (e) => {
      onError(e);
    });
  } catch (error) {
    onError(error);
  }
}

// Export the POST handler
export async function POST(req, res) {
  try {
    const { input, speed, model, voice } = await req.json();

    await new Promise((resolve, reject) => {
      text2Speech({
        res,
        model,
        voice,
        input,
        speed,
        onSuccess: (result) => {
          console.log('Audio generation success:', result);
          resolve(new Response(JSON.stringify(result), { status: 200 }));
        },
        onError: (error) => {
          console.error('Audio generation error:', error);
          res.status(500).json({ error: 'Audio generation failed' });
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Request handling error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
