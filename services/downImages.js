// downImages.js
const { downloadMediaMessage } = require('@adiwajshing/baileys');
const fs = require('node:fs/promises');
const path = require('path');

const savePhoto = async (ctx) => {
    try {
        const buffer = await downloadMediaMessage(ctx, 'buffer');
        const userDirPath = path.join(process.cwd(), 'tmp', ctx.from);
        const imageFileName = `photo-${Date.now()}.jpg`;
        const imageFilePath = path.join(userDirPath, imageFileName);

        await fs.mkdir(userDirPath, { recursive: true });
        await fs.writeFile(imageFilePath, buffer);

        console.log(`Imagen guardada en: ${imageFilePath}`);

        return imageFilePath;
    } catch (error) {
        console.error('Error al guardar la imagen:', error);
        throw error;
    }
};

module.exports = {
    savePhoto,
};
