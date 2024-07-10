//pdfProcessor.js
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { convert } = require('pdf-poppler');
const Tesseract = require('tesseract.js');

const extractTextFromPDF = async (pdfFilePath, pdfFileName) => {
    try {
        const userDirPath = path.dirname(pdfFilePath);
        const imageOutputPath = path.join(userDirPath, 'images');
        
        // Path del archivo JSON que contendrá todos los textos extraídos
        const allPdfsPath = path.join(userDirPath, 'allPdfs.json');

        // Create directory for images
        if (!fs.existsSync(imageOutputPath)) {
            fs.mkdirSync(imageOutputPath, { recursive: true });
        }

        // Convert PDF to images
        await convert(pdfFilePath, {
            format: 'jpeg',
            out_dir: imageOutputPath,
            out_prefix: pdfFileName,
            page: null
        }).catch(error => {
            console.error('Error al convertir el PDF a imágenes:', error);
            throw error;
        });

        const pdfTextArray = [];

        // Read images and perform OCR
        const files = fs.readdirSync(imageOutputPath);
        for (const file of files) {
            const filePath = path.join(imageOutputPath, file);
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng').catch(error => {
                console.error('Error al realizar OCR:', error);
                throw error;
            });
            pdfTextArray.push(text);
        }

        const pdfText = pdfTextArray.join('\n');

        // Clean up images
        files.forEach(file => fs.unlinkSync(path.join(imageOutputPath, file)));

        // Leer el archivo JSON existente, o crear uno nuevo si no existe
        let allPdfs = [];
        if (fs.existsSync(allPdfsPath)) {
            const rawData = fs.readFileSync(allPdfsPath, 'utf8');
            allPdfs = JSON.parse(rawData);
        }

        // Crear un nuevo ID único
        const newId = allPdfs.length ? Math.max(...allPdfs.map(doc => doc.ID)) + 1 : 1;

        // Crear estructura JSON para el nuevo documento
        const newPdfData = {
            ID: newId,
            fileName: pdfFileName,
            extractedText: pdfText,
            timestamp: new Date().toISOString()
        };

        // Agregar el nuevo documento al array
        allPdfs.push(newPdfData);

        // Guardar el archivo JSON actualizado
        fs.writeFileSync(allPdfsPath, JSON.stringify(allPdfs, null, 2));
        console.log(`Información del PDF guardada en: ${allPdfsPath}`);

        return allPdfsPath;

    } catch (error) {
        console.error('Error al procesar el PDF:', error);
        throw error;
    }
};

module.exports = { extractTextFromPDF };
