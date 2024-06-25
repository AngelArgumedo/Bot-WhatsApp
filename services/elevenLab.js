const fetch = require('node-fetch');
const fs = require('node:fs');
const path = require('path');

/**
 * Genera un archivo de audio a partir de un texto usando ElevenLabs.
 * @param {string} text - El texto a convertir en audio.
 * @param {string} [voiceId='797Idj5Tpd3F66peOrOx'] - ID de la voz a usar.
 * @returns {Promise<string>} - La ruta del archivo de audio generado.
 */
const textToVoice = async (text, voiceId = '797Idj5Tpd3F66peOrOx') => {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const URL = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const headers = {
        "accept": "audio/mpeg",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    };

    const body = JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            stability: 1,
            similarity_boost: 0.8
        }
    });

    const response = await fetch(URL, { method: "POST", headers, body });
    const buffer = await response.arrayBuffer();
    const audioFilePath = path.join(process.cwd(), 'tmp', `${Date.now()}-audio.mp3`);
    fs.writeFileSync(audioFilePath, Buffer.from(buffer));

    return audioFilePath;
};

module.exports = { textToVoice };
