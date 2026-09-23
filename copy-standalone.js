const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const standalonePublic = path.join(__dirname, '.next/standalone/public');
const standaloneStatic = path.join(__dirname, '.next/standalone/.next/static');

copyDir(path.join(__dirname, 'public'), standalonePublic);
copyDir(path.join(__dirname, '.next/static'), standaloneStatic);

console.log("Copied public and .next/static to .next/standalone successfully.");
