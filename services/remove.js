const fs = require('node:fs/promises');

/**
 * Elimina los archivos temporales especificados.
 * @param {string[]} filePaths - Array de rutas de archivos a eliminar.
 */
const removeTempFiles = async (filePaths) => {
    for (const filePath of filePaths) {
        try {
            await fs.unlink(filePath);
            console.log(`Archivo temporal eliminado: ${filePath}`);
        } catch (error) {
            console.error(`Error al eliminar el archivo temporal ${filePath}:`, error);
        }
    }
};

module.exports = { removeTempFiles };
