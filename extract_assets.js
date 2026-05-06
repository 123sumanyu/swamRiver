const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'SwanRiver_Dashboard_v5_clean.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const assets = {};
let assetCount = 0;

// Function to extract and replace base64
function extractBase64(content, regex, prefix) {
    return content.replace(regex, (match, data) => {
        const varName = `${prefix}_${++assetCount}`;
        assets[varName] = data;
        return match.replace(data, `ASSET_${varName}`); // Placeholder
    });
}

// Extract from img tags
const imgRegex = /src="data:image\/[^;]+;base64,([^"]+)"/g;
htmlContent = htmlContent.replace(imgRegex, (match, data) => {
    const varName = `IMG_ASSET_${++assetCount}`;
    assets[varName] = data;
    return `src="data:image/png;base64,${varName}"`; // We'll handle the replacement in JS
});

// Extract from CSS url()
const cssRegex = /url\("data:image\/[^;]+;base64,([^"]+)"\)/g;
htmlContent = htmlContent.replace(cssRegex, (match, data) => {
    const varName = `CSS_ASSET_${++assetCount}`;
    assets[varName] = data;
    return `url("data:image/png;base64,${varName}")`;
});

// Since we can't easily use JS variables inside static HTML src attributes without JS execution,
// we will replace the placeholders in the HTML with small IDs and then use a small script to inject them back.
// OR, more simply, we just store the whole string in assets.js and use a script to find and replace them on load.

let assetsJsContent = 'const DASHBOARD_ASSETS = {\n';
for (const [key, value] of Object.entries(assets)) {
    assetsJsContent += `  "${key}": "${value}",\n`;
}
assetsJsContent += '};\n\n';
assetsJsContent += `
function injectAssets() {
    document.querySelectorAll('img[src^="data:image/png;base64,"]').forEach(img => {
        const key = img.src.split(',')[1];
        if (DASHBOARD_ASSETS[key]) {
            img.src = "data:image/png;base64," + DASHBOARD_ASSETS[key];
        }
    });
    // Handle CSS backgrounds if needed (though usually CSS assets are small)
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAssets);
} else {
    injectAssets();
}
`;

fs.writeFileSync(path.join(__dirname, 'assets.js'), assetsJsContent);
fs.writeFileSync(htmlPath, htmlContent);

console.log(`Extracted ${assetCount} base64 assets to assets.js`);
