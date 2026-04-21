/**
 * Script que copia o build do Vite para android/app/src/main/assets/www/
 * para ser servido offline dentro do APK.
 *
 * Uso: node scripts/copy-web.js
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "frontend", "dist");
const DEST = path.join(__dirname, "..", "assets", "www");

if (!fs.existsSync(SRC)) {
  console.error("❌ Pasta dist/ não encontrada. Rode npm run build:web primeiro.");
  process.exit(1);
}

// Remove destino antigo e recria
function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) rmrf(full);
    else fs.unlinkSync(full);
  });
  fs.rmdirSync(dir);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

rmrf(DEST);
copyDir(SRC, DEST);
console.log(`✅ Web app copiado para ${DEST}`);
