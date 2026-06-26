const API_BASE = 'http://localhost:8080';

function formatImage(path) {
  if (!path) return null;

  if (path.startsWith('blob:') || path.startsWith('data:')) return path;
  if (path.startsWith('http') && !path.includes('localhost') && !path.includes('127.0.0.1')) return path;

  let clean = path.replace(/^https?:\/\/[^\/]+/, '');
  clean = clean.replace(/^\/+/, '');

  const base = API_BASE.replace(/\/+$/, '');
  return `${base}/${clean}`;
}

console.log(formatImage('/uploads/1782369985-images-2.webp'));
