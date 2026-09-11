import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const KEY = 'carpooling.theme';

/**
 * El claro es el tema base y no lleva clase; el oscuro se marca con `dark`
 * sobre <html>, que es lo que activa `darkMode: 'class'` de Tailwind.
 *
 * Antes era al revés (oscuro base, clase `light`) y el tema se aplicaba en un
 * efecto, o sea después del primer pintado. Ahora el mismo cálculo corre en un
 * script en línea dentro de index.html para que no haya parpadeo.
 */
function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

/**
 * La misma lógica que corre en el script de index.html: si se separan, vuelve
 * el parpadeo.
 *
 * El claro es el predeterminado y no hereda la preferencia del sistema a
 * propósito: la app se diseñó en claro, y quien la abra por primera vez desde
 * un teléfono en oscuro vería una versión que no es la pensada. El oscuro
 * queda a un toque en Configuración.
 */
function readTheme(): Theme {
  try {
    if (localStorage.getItem(KEY) === 'dark') return 'dark';
  } catch {
    // localStorage falla en navegación privada; el claro es el respaldo.
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = (t: Theme) => {
    try { localStorage.setItem(KEY, t); } catch {}
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
