import aivideoapi from '@api/aivideoapi';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Authenticate with the API
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Build the request body using the gen3 alpha model from Runway.
    // Extend the video to 50 seconds (5 segments of 10 seconds each).
    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3 alpha',
      width: 1280,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 10
    };

    // Generate the video using the API
    const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);

    // Assume response.data includes a property `video_url` that links to the generated video
    res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating video' });
  }
}
}
