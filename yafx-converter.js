// Importing the file system module
const fs = require('fs');

// Reading the JSON file synchronously
const data = fs.readFileSync('data.json');

try {
    // Parsing the JSON data
    const jsonData = JSON.parse(data);

    // Outputting the parsed JSON data
    console.log(jsonData);
} catch (error) {
    // Handling any parsing errors
    console.error('Error parsing JSON:', error);
}


