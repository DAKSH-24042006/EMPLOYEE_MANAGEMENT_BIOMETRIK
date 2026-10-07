const fs = require("fs");
const path = require("path");

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
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { force: true });
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const standalonePublic = path.join(__dirname, ".next/standalone/public");
const standaloneStatic = path.join(__dirname, ".next/standalone/.next/static");

copyDir(path.join(__dirname, "public"), standalonePublic);
copyDir(path.join(__dirname, ".next/static"), standaloneStatic);

const filesToCopy = [
  ".env.local",
  ".env",
  "seed_system_admin.js",
  "seed_admin.js",
  "seed_multi_roles.js",
  "seed_user.js",
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    const dest = path.join(__dirname, ".next/standalone", file);
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { force: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log("Copied public and .next/static to .next/standalone successfully.");
