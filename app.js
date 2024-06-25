const { postCompletion } = require('./services/LLM');
const { saveAudio, convertOggMp3 } = require('./services/procesarAud');
const { transcribeAudio } = require('./services/whisper');
const { removeTempFiles } = require('./services/remove');
const { savePDF } = require('./services/downloadPDF');
const { extractTextFromPDF } = require('./services/pdfProcessor');
const { textToVoice } = require('./services/elevenLab');
const { savePhoto } = require('./services/downImages');
const { generateImageFromText, recognizeImage } = require('./services/huggingface');
const { logConversation, loadConversation } = require('./services/logConversation');
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Lista blanca de números permitidos
const whitelist = ['573013120442', '573104615783', '573016285924', "573004504878", '5215633527242', '573123726325', '573157236751'];

// Función para verificar si un número está en la lista blanca
const isWhitelisted = (number) => {
    return whitelist.includes(number);
};

// Mensaje de sistema para definir la personalidad del bot
const botPersonality = {
    role: 'system',
    content: `${process.env.BOT_PROMPT}`
};

const flowHelp = addKeyword('Ayuda')
    .addAction(async (ctx, ctxFn) => {
        if (!isWhitelisted(ctx.from)) {
            await ctxFn.flowDynamic('No tiene acceso al bot.');
            return;
        }
        const response = [
            'Hola soy Lucia un bot 🤖 para ayudarte con tus dudas...',
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
        ];
        await ctxFn.flowDynamic(response);
        await logConversation(ctx.from, 'Ayuda', response.join('\n'));
    });

// Función para cargar el historial de conversaciones y crear los mensajes para la API de LLM
const createMessagesWithHistory = async (userNumber, newMessage) => {
    const history = await loadConversation(userNumber);
    const messages = [botPersonality].concat(history.map(entry => ({
        role: 'user',
        content: entry.userMessage
    })).concat(history.map(entry => ({
        role: 'assistant',
        content: entry.botResponse
    }))));

    messages.push({ role: 'user', content: newMessage });
    return messages;
};


/**
 * @description Función para manejar solicitudes especiales
 * @param {*} ctx 
 * @param {*} ctxFn 
 * @param {*} userMessage 
 * @returns Mensaje de respuesta
 */
const handleSpecialRequests = async (ctx, ctxFn, userMessage) => {
    const lowerCaseMessage = userMessage.toLowerCase();

    if (lowerCaseMessage.includes('imagen') || lowerCaseMessage.includes('imagina:')) {
        const response = 'Para generar una imagen, escribe "imagina:" seguido de lo que quieres generar. Por ejemplo: "imagina: un gato comiendo sushi".';
        await ctxFn.flowDynamic(response);
        await logConversation(ctx.from, userMessage, response);
        return true;
    }

    if (lowerCaseMessage.includes('audio') || lowerCaseMessage.includes('tts:')) {
        const response = 'Para convertir texto a audio, escribe "tts:" seguido de tu pregunta o mensaje. Por ejemplo: "tts: ¿Cuál es la capital de Colombia?".';
        await ctxFn.flowDynamic(response);
        await logConversation(ctx.from, userMessage, response);
        return true;
    }

    return false;
};


/**
 * @description Flow de OpenAI
 * @param {*} ctx 
 * @param {*} ctxFn
 * @returns Text response from OpenAI
 */
const flowOpenai = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, ctxFn) => {
        if (!isWhitelisted(ctx.from)) {
            await ctxFn.flowDynamic('No tiene acceso al bot.');
            return;
        }

        const userMessage = ctx.body;
        
        // Manejar solicitudes especiales
        const handled = await handleSpecialRequests(ctx, ctxFn, userMessage);
        if (handled) return;

        const messages = await createMessagesWithHistory(ctx.from, userMessage);
        const answer = await postCompletion(messages);
        await ctxFn.flowDynamic(answer);
        await logConversation(ctx.from, userMessage, answer);
    });

// Flow de audio
const flowAudio = addKeyword(EVENTS.VOICE_NOTE)
    .addAction(async (ctx, ctxFn) => {
        if (!isWhitelisted(ctx.from)) {
            await ctxFn.flowDynamic('No tiene acceso al bot.');
            return;
        }

        let audioFilePath;
        let mp3FilePath;

        try {
            audioFilePath = await saveAudio(ctx);
            console.log(`Audio guardado en: ${audioFilePath}`);
            mp3FilePath = audioFilePath.replace('.ogg', '.mp3');
            await convertOggMp3(audioFilePath, mp3FilePath);
            console.log(`Audio convertido a MP3 y guardado en: ${mp3FilePath}`);
            const transcription = await transcribeAudio(mp3FilePath);
            console.log(`Texto transcrito: ${transcription}`);
            const messages = await createMessagesWithHistory(ctx.from, transcription);
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);
            await logConversation(ctx.from, transcription, answer);
            console.log('¡Tu audio ha sido procesado con éxito!');
        } catch (error) {
            console.error('Error al procesar el audio:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu audio. Por favor, inténtalo de nuevo más tarde.');
        } finally {
            const filesToDelete = [];
            if (audioFilePath) filesToDelete.push(audioFilePath);
            if (mp3FilePath) filesToDelete.push(mp3FilePath);
            await removeTempFiles(filesToDelete);
        }
    });

// Flow para manejar PDFs
const flowPDF = addKeyword('pdf:')
    .addAnswer(
        ['Por favor adjunta el documento PDF que quieres que procese y escribe lo que deseas hacer (por ejemplo, "resumen" o "análisis").'],
        null,
        async (ctx, { flowDynamic, state }) => {
            state.pdfAction = ctx.body.replace(/^pdf:/i, '').trim();
            console.log('Esperando adjunto PDF...');
        }
    )
    .addAction(async (ctx, ctxFn) => {
        if (!isWhitelisted(ctx.from)) {
            await ctxFn.flowDynamic('No tiene acceso al bot.');
            return;
        }

        if (!ctx.hasMedia) {
            await ctxFn.flowDynamic('Por favor adjunta un documento PDF.');
            return;
        }

        try {
            const pdfFilePath = await savePDF(ctx);
            const pdfFileName = path.basename(pdfFilePath, path.extname(pdfFilePath));
            console.log(`PDF guardado: ${pdfFileName}`);

            const pdfText = await extractTextFromPDF(pdfFilePath, pdfFileName);
            const messages = await createMessagesWithHistory(ctx.from, `PDF adjunto: ${pdfFileName}. ${state.pdfAction}`);
            const answer = await postCompletion(messages);

            await ctxFn.flowDynamic(answer);
            await logConversation(ctx.from, `PDF adjunto: ${pdfFileName}. ${state.pdfAction}`, answer);
        } catch (error) {
            console.error('Error al procesar el documento:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu documento. Por favor, inténtalo de nuevo más tarde.');
        }
    });

// Flow de Text-to-Speech
const flowTTS = addKeyword('tts:')
    .addAnswer(
        ["Espera en lo que me grabo hablando 🗣."],
        null,
        async (ctx, { flowDynamic, state }) => {
            if (!isWhitelisted(ctx.from)) {
                await flowDynamic('No tiene acceso al bot.');
                return;
            }
            try {
                const userInput = ctx.body.replace(/^tts:/i, '').trim();
                const messages = await createMessagesWithHistory(ctx.from, userInput);
                const gptResponse = await postCompletion(messages);
                const audioFilePath = await textToVoice(gptResponse);
                console.log(`Audio generado y guardado en: ${audioFilePath}`);
                await flowDynamic([{ body: "Aquí esta tu respuesta 😊", media: audioFilePath }]);
                await logConversation(ctx.from, userInput, gptResponse);
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
            if (!isWhitelisted(ctx.from)) {
                await flowDynamic('No tiene acceso al bot.');
                return;
            }
            try {
                const userNumber = ctx.from;
                const imageInput = ctx.body.replace(/^imagina:/i, '').trim();
                const imageUrl = await generateImageFromText(imageInput, userNumber);
                console.log(`Imagen generada y guardada en: ${imageUrl}`);
                await flowDynamic([{ body: "Aquí tienes tu imagen:", media: imageUrl }]);
                await logConversation(ctx.from, imageInput, imageUrl);
                console.log('¡Tu imagen ha sido generada con éxito!');
            } catch (error) {
                console.error('Error al generar la imagen:', error);
                await flowDynamic('Lo siento, ha ocurrido un error al generar la imagen. Por favor, inténtalo de nuevo más tarde.');
            }
        }
);

// Flujo para reconocer imágenes
const flowImageRecognition = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, ctxFn) => {
        if (!isWhitelisted(ctx.from)) {
            await ctxFn.flowDynamic('No tiene acceso al bot.');
            return;
        }
        try {
            console.log('entro en la funcion flowImageRecognition');
            const photoPath = await savePhoto(ctx);
            const imageLabels = await recognizeImage(photoPath);
            const response = JSON.stringify(imageLabels, null, 2);
            const generatedText = imageLabels[0]?.generated_text;
            console.log(`Texto generado formateado: ${generatedText}`);
            const messages = await createMessagesWithHistory(ctx.from, generatedText);
            const answer = await postCompletion(messages);
            await ctxFn.flowDynamic(answer);
            await logConversation(ctx.from, `Imagen procesada: ${photoPath}`, answer);
            console.log('¡La imagen ha sido procesada con éxito!');
        } catch (error) {
            console.error('Error al procesar la imagen:', error);
            await ctxFn.flowDynamic('Lo siento, ha ocurrido un error al procesar tu imagen. Por favor, inténtalo de nuevo más tarde.');
        }
    });

// Funcion main
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowHelp, flowOpenai, flowAudio, flowPDF, flowTTS, flowGenerateImageFromText, flowImageRecognition]);
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
