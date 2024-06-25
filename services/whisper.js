// whisper.js
const fs = require('fs');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transcribeAudio = async (audioFilePath) => {
  if (!fs.existsSync(audioFilePath)) {
    throw new Error('No se encuentra el archivo');
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error.response ? error.response.data : error.message);
    return 'ERROR';
  }
};

module.exports = { transcribeAudio };
