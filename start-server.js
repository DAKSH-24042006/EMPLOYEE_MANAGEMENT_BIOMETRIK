const fs = require('fs');
const path = require('path');

// 1. Recursively copy directory
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

// 2. Copy the static files into the standalone directory so the server can find them
try {
  console.log("Copying Next.js static files to standalone directory...");
  const rootDir = __dirname;
  const standaloneDir = path.join(rootDir, '.next/standalone');
  
  copyDir(path.join(rootDir, 'public'), path.join(standaloneDir, 'public'));
  copyDir(path.join(rootDir, '.next/static'), path.join(standaloneDir, '.next/static'));
  
  console.log("Static files copied successfully!");
} catch (e) {
  console.error("Failed to copy static files:", e);
}

// 3. Change working directory to standalone and start the server
const standalonePath = path.join(__dirname, '.next/standalone');
process.chdir(standalonePath);

// Start Next.js standalone server
require(path.join(standalonePath, 'server.js'));
