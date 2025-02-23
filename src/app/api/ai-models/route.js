import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi'

const request = require('request');

const options = {
  method: 'POST',
  url: 'https://runwayml.p.rapidapi.com/generate/text',
  headers: {
    'x-rapidapi-key': '5f480fd5e6mshb21466ec4e56a98p175e3cjsn2d7d41efbe18',
    'x-rapidapi-host': 'runwayml.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  body: {
    text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
    model: 'gen3',
    width: 1344,
    height: 768,
    motion: 5,
    seed: 0,
    callback_url: '',
    time: 5
  },
  json: true
};

request(options, function (error, response, body) {
	if (error) throw new Error(error);

	console.log(body);
});
