const fs = require('fs').promises;
const path = require('path');

// Función para cargar todos los textos extraídos para un usuario específico
const loadAllPdfs = async (userDirPath) => {
    try {
        const allPdfsPath = path.join(userDirPath, 'allPdfs.json');
        console.log(`Intentando leer ${allPdfsPath}`);
        const rawData = await fs.readFile(allPdfsPath, 'utf8');
        console.log('Archivo leído correctamente');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Error al cargar los PDFs:', error);
        return []; // Devuelve un array vacío en caso de error
    }
};

// Función para recuperar textos relevantes basados en una consulta para un usuario específico
const retrieveRelevantTexts = async (userDirPath, query) => {
    try {
        const allPdfs = await loadAllPdfs(userDirPath);
        console.log('PDFs cargados:', allPdfs);
        const relevantTexts = allPdfs.filter(doc => 
            doc.extractedText.toLowerCase().includes(query.toLowerCase())
        );
        console.log('Textos relevantes encontrados:', relevantTexts);
        return relevantTexts;
    } catch (error) {
        console.error('Error al procesar la consulta:', error);
        throw error; // Re-lanza el error para que pueda ser capturado externamente
    }
};

module.exports = { retrieveRelevantTexts };
