const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'SwanRiver_Dashboard_v5_clean.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Regex to find ALL_DATA content
const dataRegex = /const ALL_DATA = (\[[\s\S]*?\]);/;
const dataMatch = htmlContent.match(dataRegex);

if (dataMatch) {
    const allData = dataMatch[1];
    // Create survey_data.js
    fs.writeFileSync(path.join(__dirname, 'survey_data.js'), `const ALL_DATA = ${allData};\n\nif (typeof module !== "undefined") module.exports = ALL_DATA;`);
    console.log('Successfully extracted ALL_DATA to survey_data.js');

    // Replace the huge block in HTML with a script reference
    let newHtml = htmlContent.replace(dataRegex, '// ALL_DATA moved to survey_data.js');
    
    // Find the end of the script block or just before the closing script tag
    // We'll also extract the rest of the scripts into scripts.js
    const scriptRegex = /<script>([\s\S]*?)<\/script>/;
    const scriptMatch = newHtml.match(scriptRegex);
    
    if (scriptMatch) {
        const scriptContent = scriptMatch[1];
        fs.writeFileSync(path.join(__dirname, 'scripts.js'), scriptContent);
        console.log('Successfully extracted logic to scripts.js');
        
        newHtml = newHtml.replace(scriptRegex, `
  <script src="survey_data.js"></script>
  <script src="scripts.js"></script>`);
    }

    fs.writeFileSync(htmlPath, newHtml);
    console.log('Updated SwanRiver_Dashboard_v5_clean.html to use external scripts.');
} else {
    console.log('Could not find ALL_DATA in the HTML file.');
}
