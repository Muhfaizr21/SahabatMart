import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.jsx' || ext === '.js' || ext === '.css') {
        let content = await fs.readFile(fullPath, 'utf-8');
        let newContent = content
          .replace(/\.png/g, '.webp')
          .replace(/\.jpg/g, '.webp')
          .replace(/\.jpeg/g, '.webp')
          .replace(/\.PNG/g, '.webp')
          .replace(/\.JPG/g, '.webp')
          .replace(/\.JPEG/g, '.webp');

        if (content !== newContent) {
          await fs.writeFile(fullPath, newContent, 'utf-8');
          console.log(`Updated: ${fullPath}`);
        }
      }
    }
  }
}

async function main() {
  const target = path.join(__dirname, 'src');
  await processDirectory(target);
  console.log('Selesai update codebase React!');
}

main();
