const fs = require('fs');
const pdf = require('pdf-parse');
const { downloadMediaMessage } = require('@adiwajshing/baileys');
const path = require('path');

async function downloadPDF(ctx) {
    try {
        // Crear el directorio 'tmp' si no existe
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        // Definir la ruta de salida del PDF
        const outputPath = path.join(tmpDir, `document-${Date.now()}.pdf`);

        // Descargar el mensaje de medios que contiene el PDF
        const buffer = await downloadMediaMessage(ctx, 'buffer');
        
        // Escribir el contenido del buffer en un archivo PDF en la carpeta tmp
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`PDF descargado y guardado en: ${outputPath}`);
        
        return outputPath; // Devolver la ruta del archivo descargado
    } catch (error) {
        console.error('Error al descargar el PDF:', error);
        throw error;
    }
}


const pdfToText = async (pdfPath) => {
  const dataBuffer = fs.readFileSync(pdfPath);
  try {
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw error;
  }
};

module.exports = { downloadPDF, pdfToText };
