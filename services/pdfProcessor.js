// pdfProcessor.js
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

const extractTextFromPDF = async (pdfFilePath, pdfFileName) => {
    const pdfParser = new PDFParser();

    return new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            const pdfText = pdfData.formImage.Pages.map(page => page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(" ")).join("\n");
            
            // Crear estructura JSON
            const jsonData = {
                fileName: pdfFileName,
                extractedText: pdfText,
                timestamp: new Date().toISOString()
            };

            const userDirPath = path.dirname(pdfFilePath);
            const jsonFilePath = path.join(userDirPath, `${pdfFileName}.json`);
            fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
            console.log(`Información del PDF guardada en: ${jsonFilePath}`);
            resolve(jsonFilePath);
        });

        pdfParser.loadPDF(pdfFilePath);
    });
};

module.exports = { extractTextFromPDF };
