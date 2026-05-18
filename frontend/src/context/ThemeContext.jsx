import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadTheme } from '../lib/themeEngine';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

/**
 * ThemeProvider
 * 
 * Wrapper untuk seluruh aplikasi agar tema selalu sinkron dengan database.
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshTheme = async () => {
    const newTheme = await loadTheme();
    setTheme(newTheme);
    setLoading(false);
  };

  useEffect(() => {
    refreshTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
