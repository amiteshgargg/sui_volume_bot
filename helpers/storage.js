const fs = require('fs');
const path = require('path');


exports.saveJsonRewrite = async(data, filePath) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 4), 'utf8', err => {
        if (err) {
            console.error("Error writing the file:", err);
            return;
        }
        console.log("File updated successfully!");
    });
}

exports.getJson = async (filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
}

exports.saveJsonToFile = async (newData, filePath) => {
    try {
        console.log("[saveJsonToFile]");
        const assetsDir = path.dirname(filePath);
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        let existingData = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
        }

        const updatedData = [...existingData];
        newData.forEach(item => {
            const exists = existingData.some(existingItem =>
                JSON.stringify(existingItem) === JSON.stringify(item)
            );
            if (!exists) {
                updatedData.push(item);
            }
        });
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 4), 'utf8');
        console.log("Data has been saved to the file.");
    } catch (err) {
        throw new Error(err);
    }
}