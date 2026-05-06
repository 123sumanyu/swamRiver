const fs = require('fs');
const orig = fs.readFileSync('SwanRiver_Dashboard_v5.html', 'utf8');
let clean = fs.readFileSync('SwanRiver_Dashboard_v5_clean.html', 'utf8');
const regex = /<img[^>]*src="(data:image[^"]+)"[^>]*>/g;
let m;
const images = [];
while ((m = regex.exec(orig)) !== null) {
  images.push(m[1]);
}
if (images.length > 0) {
  let i = 0;
  clean = clean.replace(/DATA_URI_REMOVED/g, () => images[i++]);
  fs.writeFileSync('SwanRiver_Dashboard_v5_clean.html', clean);
  console.log('Replaced data URIs: ' + i);
} else {
  console.log('No images found');
}
