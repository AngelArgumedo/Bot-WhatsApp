// logConversation.js
const fs = require('fs');
const path = require('path');

const logConversation = async (userNumber, userMessage, botResponse) => {
    const userDirPath = path.join(process.cwd(), 'tmp', userNumber);
    const logFilePath = path.join(userDirPath, 'conversation.json');

    const logEntry = {
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse
    };

    try {
        await fs.promises.mkdir(userDirPath, { recursive: true });

        let logData = [];
        if (fs.existsSync(logFilePath)) {
            const existingLog = await fs.promises.readFile(logFilePath, 'utf-8');
            logData = JSON.parse(existingLog);
        }

        logData.push(logEntry);
        await fs.promises.writeFile(logFilePath, JSON.stringify(logData, null, 2));

        console.log(`Conversación registrada en: ${logFilePath}`);
    } catch (error) {
        console.error('Error al registrar la conversación:', error);
    }
};

const loadConversation = async (userNumber) => {
    const userDirPath = path.join(process.cwd(), 'tmp', userNumber);
    const logFilePath = path.join(userDirPath, 'conversation.json');

    try {
        if (fs.existsSync(logFilePath)) {
            const existingLog = await fs.promises.readFile(logFilePath, 'utf-8');
            return JSON.parse(existingLog);
        }
        return [];
    } catch (error) {
        console.error('Error al cargar la conversación:', error);
        return [];
    }
};

module.exports = { logConversation, loadConversation };
