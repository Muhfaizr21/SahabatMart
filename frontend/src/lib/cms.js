import { useEffect } from 'react';

const loaded = {};

export default function CMSThemeProvider({ platform }) {
  useEffect(() => {
    const id = `cms-override-${platform}`;
    if (loaded[id]) return;
    loaded[id] = true;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `/api/public/cms/overrides.css?platform=${platform}`;
    document.head.appendChild(link);

    return () => {
      delete loaded[id];
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [platform]);

  return null;
}
