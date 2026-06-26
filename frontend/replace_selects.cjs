const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src', 'pages', 'admin');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace <select with <AdminSelect
  content = content.replace(/<select\b/g, '<AdminSelect');
  
  // 2. Replace </select> with </AdminSelect>
  content = content.replace(/<\/select>/g, '</AdminSelect>');

  if (content !== originalContent) {
    // 3. Add import at the top
    const importStatement = "import AdminSelect from '../../components/admin/AdminSelect';\n";
    if (!content.includes('AdminSelect from')) {
      // Find the first line that is not an import
      const lines = content.split('\n');
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim().startsWith('import ') && lines[i].trim() !== '') {
          insertIndex = i;
          break;
        }
      }
      lines.splice(insertIndex, 0, importStatement);
      content = lines.join('\n');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${path.basename(filePath)}`);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (file.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

traverseDir(adminDir);
console.log('Select replacement complete.');
