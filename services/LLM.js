// Archivo: LLM.js
const axios = require('axios');
require('dotenv').config();

const postCompletion = async (messages) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo-16k-0613',
        messages: messages,
        temperature: 0.7,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('No choices returned from OpenAI');
    }

    const answer = response.data.choices[0].message.content;
    return answer;
  } catch (error) {
    console.error('Error fetching OpenAI response:', error);
    return 'Lo siento, ocurrió un error al procesar tu solicitud.';
  }
};

module.exports = { postCompletion };
