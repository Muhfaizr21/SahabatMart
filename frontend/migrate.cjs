const fs = require('fs');
const path = require('path');

const dir = './src/pages/admin';

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // Replace style={{ ...A.page, <other> }} -> style={{ <other> }}
  code = code.replace(/style=\{\{\s*\.\.\.A\.page,?\s*([^}]+)?\}\}/g, (match, other) => {
    if (other && other.trim()) return `style={{ ${other.trim()} }}`;
    return '';
  });
  // Replace exact style={{ ...A.page }} -> empty
  code = code.replace(/style=\{\{\s*\.\.\.A\.page\s*\}\}/g, '');

  // Card
  code = code.replace(/style=\{\{\s*\.\.\.A\.card,?\s*([^}]+)?\}\}/g, (match, other) => {
    let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
    return `className="bg-white rounded-2xl border border-slate-200 shadow-sm"${newStyle}`;
  });
  code = code.replace(/style=\{\{\s*\.\.\.A\.card\s*\}\}/g, 'className="bg-white rounded-2xl border border-slate-200 shadow-sm"');

  // CardBody
  code = code.replace(/style=\{\{\s*\.\.\.A\.cardBody,?\s*([^}]+)?\}\}/g, (match, other) => {
    let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
    return `className="p-6"${newStyle}`;
  });
  code = code.replace(/style=\{\{\s*\.\.\.A\.cardBody\s*\}\}/g, 'className="p-6"');

  // btnPrimary
  const btnPrimaryClass = 'flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm';
  code = code.replace(/style=\{A\.btnPrimary\}/g, `className="${btnPrimaryClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.btnPrimary,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${btnPrimaryClass}"${newStyle}`;
  });

  // btnGhost
  const btnGhostClass = 'flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm';
  code = code.replace(/style=\{A\.btnGhost\}/g, `className="${btnGhostClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.btnGhost,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${btnGhostClass}"${newStyle}`;
  });

  // btnLight
  const btnLightClass = 'flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all';
  code = code.replace(/style=\{A\.btnLight\}/g, `className="${btnLightClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.btnLight,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${btnLightClass}"${newStyle}`;
  });

  // input
  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400';
  code = code.replace(/style=\{A\.input\}/g, `className="${inputClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.input,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${inputClass}"${newStyle}`;
  });

  // select
  code = code.replace(/style=\{A\.select\}/g, `className="${inputClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.select,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${inputClass}"${newStyle}`;
  });
  
  // textarea
  const textareaClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-y placeholder:text-slate-400';
  code = code.replace(/style=\{A\.textarea\}/g, `className="${textareaClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.textarea,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${textareaClass}"${newStyle}`;
  });

  // empty
  const emptyClass = 'text-center p-12 flex flex-col items-center gap-3';
  code = code.replace(/style=\{A\.empty\}/g, `className="${emptyClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.empty,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${emptyClass}"${newStyle}`;
  });

  // searchInput
  const searchInputClass = 'pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-indigo-400 transition-all w-full';
  code = code.replace(/style=\{A\.searchInput\}/g, `className="${searchInputClass}"`);
  code = code.replace(/style=\{\{\s*\.\.\.A\.searchInput,?\s*([^}]+)?\}\}/g, (match, other) => {
     let newStyle = other && other.trim() ? ` style={{ ${other.trim()} }}` : '';
     return `className="${searchInputClass}"${newStyle}`;
  });

  // Fix duplicate classNames (e.g. className="admin-page-container fade-in" className="bg-white")
  let doubleClassRegex = /className="([^"]+)"\s+className="([^"]+)"/g;
  while (doubleClassRegex.test(code)) {
    code = code.replace(doubleClassRegex, 'className="$1 $2"');
  }
  
  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log('Updated:', filePath);
  }
}

function walk(dir) {
  let list = fs.readdirSync(dir);
  list.forEach(file => {
    let filePath = path.join(dir, file);
    let stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) walk(filePath);
    else if (filePath.endsWith('.jsx')) processFile(filePath);
  });
}

walk(dir);
console.log('Done migration script');
