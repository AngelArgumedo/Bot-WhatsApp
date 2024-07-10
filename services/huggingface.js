// huggingface.js
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Carga las variables de entorno

const generateImageFromText = async (text, userNumber) => {
    const fetch = (await import('node-fetch')).default;

    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/ZB-Tech/Text-to-Image',
            {
                headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
                method: 'POST',
                body: JSON.stringify({ inputs: text }),
            }
        );

        const resultBlob = await response.blob();
        const arrayBuffer = await resultBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const userDirPath = path.join(process.cwd(), 'tmp', userNumber);
        if (!fs.existsSync(userDirPath)) {
            fs.mkdirSync(userDirPath, { recursive: true });
        }
        const outputPath = path.join(userDirPath, `image-${Date.now()}.png`);
        fs.writeFileSync(outputPath, buffer);

        return outputPath;
    } catch (error) {
        console.error('Error generando la imagen:', error);
        throw error;
    }
};

const recognizeImage = async (imagePath) => {
    const fetch = (await import('node-fetch')).default;

    try {
        const data = fs.readFileSync(imagePath);
        const response = await fetch(
            "https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning",
            {
                headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
                method: "POST",
                body: data,
            }
        );

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error al reconocer la imagen:', error);
        throw error;
    }
};

module.exports = { generateImageFromText, recognizeImage };
