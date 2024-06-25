// downloadPDF.js

const { downloadMediaMessage } = require('@adiwajshing/baileys');
const fs = require('node:fs/promises');
const path = require('path');

/**
 * @description Funcion para descargar el PDF de un mensaje de WhatsApp
 * @param {Object} ctx - Objeto de contexto de WhatsApp
 * @returns {Promise<string>} - Ruta del archivo PDF descargado
 * 
 */
const savePDF = async (ctx) => {
    try {
        const buffer = await downloadMediaMessage(ctx, 'buffer');
        const userDirPath = path.join(process.cwd(), 'tmp', ctx.from);
        const pdfFileName = `document-${Date.now()}.pdf`;
        const pdfFilePath = path.join(userDirPath, pdfFileName);

        await fs.mkdir(userDirPath, { recursive: true });
        await fs.writeFile(pdfFilePath, buffer);

        console.log(`PDF guardado en: ${pdfFilePath}`);

        return pdfFilePath;
    } catch (error) {
        console.error('Error al guardar el PDF:', error);
        throw error;
    }
};

module.exports = {
    savePDF,
};
