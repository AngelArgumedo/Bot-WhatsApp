// procesarAud.js
const { downloadMediaMessage } = require('@adiwajshing/baileys');
const fs = require('node:fs/promises');
const path = require('path');
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

// Función para guardar el archivo de audio
const saveAudio = async (ctx) => {
  try {
    const buffer = await downloadMediaMessage(ctx, 'buffer');
    const userDirPath = path.join(process.cwd(), 'tmp', ctx.from);
    const audioFileName = `voice-note-${Date.now()}.ogg`;
    const audioFilePath = path.join(userDirPath, audioFileName);

    await fs.mkdir(userDirPath, { recursive: true });
    await fs.writeFile(audioFilePath, buffer);

    return audioFilePath;
  } catch (error) {
    console.error('Error while handling audio:', error);
    throw error;
  }
};

// Función para convertir el archivo de audio de OGG a MP3
const convertOggMp3 = async (inputStream, outStream) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputStream)
      .audioQuality(96)
      .toFormat("mp3")
      .save(outStream)
      .on("progress", (p) => null)
      .on("end", () => {
        resolve(true);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

// Exportar las funciones
module.exports = { saveAudio, convertOggMp3 };
