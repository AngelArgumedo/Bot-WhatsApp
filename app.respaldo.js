// Archivo: app.js
const { postCompletion } = require('./services/LLM');
const { saveAudio, convertOggMp3 } = require('./services/procesarAud');
const { transcribeAudio } = require('./services/whisper');
const { removeTempFiles } = require('./services/remove');
const { pdfToText, downloadPDF } = require('./services/documentToText');
const { textToVoice } = require('./services/elevenLab');
const { savePhoto} = require('./services/downImages')
const { generateImageFromText, recognizeImage } = require('./services/huggingface');
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const flowHelp = addKeyword('Ayuda')
    .addAnswer(['Hola soy Lucia un bot 🤖 para ayudarte con tus dudas...',
        'Para usarme solo escribe cualquier duda que tengas y yo me encargare de responderla.',
        '👉 Puedes enviarme audio, yo lo escuchare y te respondere!!',
        '👉 Tengo la capacidad de ver, si me envias una imagen te dire que contiene!!',
        '👉 Tambien puedes enviarme un documento PDF y lo analizare para ti.',
        '       ',
        '👉 Si quieres que te responda con voz solo escribe tts: y pregunta lo que quieras.',
        ' 💡Ejemplo💡  tts: cual es la capital de colombia',
        '       ',
        '👉 Si quieres generar una imagen solo escribe imagina: escribe lo que quieras generar, para mayor precision escribelo en ingles',
        ' 💡Ejemplo💡  imagina: cat eating sushi',
    ]);



// Flow de OpenAI
const flowOpenai = addKeyword(EVENTS.WELCOME)
    .addAction(
        async (ctx, ctxFn) => {
            let messages = [
                { "role": "system", "content": process.env.BOT_PROMPT },
                { "role": "user", "content": ctx.body }
            ];
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);
        });

// Flow de audio
const flowAudio = addKeyword(EVENTS.VOICE_NOTE)
    .addAction(async (ctx, ctxFn) => {
        //await ctxFn.flowDynamic('Dame un momento para procesar tu audio... 🎵');

        let audioFilePath;
        let mp3FilePath;

        try {
            // Guardar el archivo de audio en formato OGG
            audioFilePath = await saveAudio(ctx);
            console.log(`Audio guardado en: ${audioFilePath}`);
            
            // Definir el nombre del archivo de audio MP3
            mp3FilePath = audioFilePath.replace('.ogg', '.mp3');
            
            // Convertir el archivo de audio de OGG a MP3
            await convertOggMp3(audioFilePath, mp3FilePath);
            console.log(`Audio convertido a MP3 y guardado en: ${mp3FilePath}`);
            
            // Transcribir el audio a texto
            const transcription = await transcribeAudio(mp3FilePath);
            console.log(`Texto transcrito: ${transcription}`);

            // Obtener respuesta de LLM
            let messages = [
                { "role": "system", "content": process.env.BOT_PROMPT },
                { "role": "user", "content": `${transcription}` }
            ];
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);

            console.log('¡Tu audio ha sido procesado con éxito!');
        } catch (error) {
            console.error('Error al procesar el audio:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu audio. Por favor, inténtalo de nuevo más tarde.');
        } finally {
            // Eliminar archivos temporales
            const filesToDelete = [];
            if (audioFilePath) filesToDelete.push(audioFilePath);
            if (mp3FilePath) filesToDelete.push(mp3FilePath);

            await removeTempFiles(filesToDelete);
        }
    });



// Flow de documentos
const flowDocument = addKeyword(EVENTS.DOCUMENT)
    .addAction(async (ctx, ctxFn) => {
        let pdfFilePath;
        try {
            // Descargar el PDF
            const pdfFilePath = await downloadPDF(ctx);

            // Convertir el PDF a texto
            const text = await pdfToText(pdfFilePath);
            console.log(`Texto extraído del PDF`);

            // Obtener respuesta de LLM
            let messages = [
                { "role": "system", "content": process.env.BOT_PROMPT },
                { "role": "user", "content": `${text}, realiza un análisis, y dame lo siguiente: Titulo, Introduccion, desarrollo y conclusion.` }
            ];
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);
        } catch (error) {
            console.error('Error al procesar el documento:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu documento. Por favor, inténtalo de nuevo más tarde.');
        }finally {
            // Eliminar archivos temporales (PDF)
            if (pdfFilePath) {
                await removeTempFiles([pdfFilePath]);
            }
        }
    });



// Flow de Text-to-Speech
const flowTTS = addKeyword('tts:')
    .addAnswer(
        ["Espera en lo que me grabo hablando 🗣."],
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                // Obtener el texto ingresado por el usuario, removiendo el prefijo 'tts:'
                const userInput = ctx.body.replace(/^tts:/i, '').trim();

                // Obtener respuesta de LLM (ChatGPT)
                let messages = [
                    { "role": "system", "content": process.env.BOT_PROMPT },
                    { "role": "user", "content": `${userInput} responde de forma corta y precisa.` }
                ];
                const gptResponse = await postCompletion(messages);

                // Generar audio a partir de la respuesta de ChatGPT
                const audioFilePath = await textToVoice(gptResponse);
                console.log(`Audio generado y guardado en: ${audioFilePath}`);

                // Responder al usuario con el archivo de audio
                await flowDynamic([{ body: "Aquí esta tu respuesta 😊", media: audioFilePath }]);

                console.log('¡Tu texto ha sido convertido a audio con éxito!');
            } catch (error) {
                console.error('Error al generar el audio:', error);
                await flowDynamic('Lo siento, ha ocurrido un error al generar el audio. Por favor, inténtalo de nuevo más tarde.');
            }
        }
);


// Flujo para generar imágenes a partir de texto
const flowGenerateImageFromText = addKeyword('imagina:')
    .addAnswer( 
        ["Generando imagen, por favor espera...🎨"],
        null,
        async (ctx, { flowDynamic, state }) => {
            try {
                const userNumber = ctx.from;
                // Obtener el texto ingresado por el usuario, removiendo el prefijo 'imagina:'
                const imageInput = ctx.body.replace(/^imagina:/i, '').trim();

                // Generar la imagen a partir del texto
                const imageUrl = await generateImageFromText(imageInput, userNumber);
                console.log(`Imagen generada y guardada en: ${imageUrl}`);

                // Responder al usuario con la imagen
                await flowDynamic([{ body: "Aquí tienes tu imagen:", media: imageUrl }]);

                console.log('¡Tu imagen ha sido generada con éxito!');
            } catch (error) {
                console.error('Error al generar la imagen:', error);
                await flowDynamic('Lo siento, ha ocurrido un error al generar la imagen. Por favor, inténtalo de nuevo más tarde.');
            }
        }
);
    

// Flujo para reconocer imagenes
const flowImageRecognition = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, ctxFn) => {
        try {
            console.log('entro en la funcion flowImageRecognition');
            const photoPath = await savePhoto(ctx);

            const imageLabels = await recognizeImage(photoPath);
            const response = JSON.stringify(imageLabels, null, 2); // Formatear la respuesta para que sea legible
            const generatedText = imageLabels[0]?.generated_text;
            console.log(`Texto generado formateado: ${generatedText}`);
            // Obtener respuesta de LLM
            let messages = [
                { "role": "system", "content": process.env.BOT_PROMPT },
                { "role": "user", "content": `traduce lo siguiente y se creativo con la traduccion, haz como si la hubieras visto: ${generatedText}` }
            ];
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);

            console.log('¡La imagen ha sido procesada con éxito!');
        } catch (error) {
            console.error('Error al procesar la imagen:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu imagen. Por favor, inténtalo de nuevo más tarde.');
        }
    });



// Funcion main
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowHelp, flowOpenai, flowAudio, flowDocument, flowTTS, flowGenerateImageFromText, flowImageRecognition]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main().catch(error => {
    console.error('Unhandled error in main:', error);
});
