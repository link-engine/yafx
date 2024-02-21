import yafx from './yafx';

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


//TODO - Convert the JSON data to YAFX