import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const KEY = 'carpooling.theme';

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === 'light') html.classList.add('light');
  else html.classList.remove('light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  };
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
