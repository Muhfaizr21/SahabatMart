const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src/pages/admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add createPortal import if not present
  if ((content.includes('showModal && (') || content.includes('modal && (')) && !content.includes('createPortal')) {
    content = content.replace(/import React.*?;/, match => `${match}\nimport { createPortal } from 'react-dom';`);
    changed = true;
  }

  if (content.includes('{showModal && (')) {
    content = content.replace(/\{showModal && \(\s*(<div[\s\S]*?className="fixed inset-0[^>]*>[\s\S]*?)(\s*)<\/div>\s*\)\}/g, 
      (match, p1, p2) => `{showModal && createPortal(\n${p1}${p2}</div>,\n        document.body\n      )}`);
    changed = true;
  }

  if (content.includes('{modal && (')) {
    content = content.replace(/\{modal && \(\s*(<div[\s\S]*?className="fixed inset-0[^>]*>[\s\S]*?)(\s*)<\/div>\s*\)\}/g, 
      (match, p1, p2) => `{modal && createPortal(\n${p1}${p2}</div>,\n        document.body\n      )}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
