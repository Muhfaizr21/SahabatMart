import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
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
      if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        const outPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        try {
          await sharp(fullPath)
            .webp({ quality: 80 })
            .toFile(outPath);
          console.log(`✅ Converted: ${fullPath} -> ${outPath}`);
          await fs.unlink(fullPath); // Hapus file lama
        } catch (err) {
          console.error(`❌ Error converting ${fullPath}:`, err.message);
        }
      }
    }
  }
}

async function main() {
  console.log('Memulai konversi Static Assets ke WebP...');
  const targets = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'src', 'assets')
  ];

  for (const target of targets) {
    try {
      await fs.access(target);
      console.log(`\nMemindai: ${target}`);
      await processDirectory(target);
    } catch (err) {
      console.log(`Folder tidak ditemukan atau tidak bisa diakses: ${target}`);
    }
  }
  console.log('\nSelesai!');
}

main();
