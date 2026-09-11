/** @type {import('tailwindcss').Config} */

// Los colores no se nombran por su tono sino por su función: `surface` en vez de
// `zinc-900`. Cada uno apunta a una variable CSS que index.css redefine según el
// tema, así que cada componente se escribe una sola vez y sirve para claro y
// oscuro. Antes había 116 líneas de parches `html.light` reinterpretando clases
// oscuras, con 15 casos sin cubrir y dos conflictos de especificidad.
//
// El formato `rgb(var(--x) / <alpha-value>)` mantiene vivos los modificadores de
// opacidad de Tailwind: `bg-surface/70` sigue funcionando.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
      },
      colors: {
        // Superficies, de atrás hacia adelante
        canvas:  token('canvas'),   // fondo de la página
        surface: token('surface'),  // tarjetas
        subtle:  token('subtle'),   // rellenos dentro de una tarjeta
        line:    token('line'),     // bordes y separadores
        'line-strong': token('line-strong'),

        // Texto, de más a menos peso
        fg:         token('fg'),
        'fg-muted': token('fg-muted'),
        'fg-faint': token('fg-faint'),

        // Acción principal. Se invierte con el tema: negro sobre claro,
        // blanco sobre oscuro.
        primary:      token('primary'),
        'on-primary': token('on-primary'),

        // Señales de estado
        live:   token('live'),    // viaje en curso, "en vivo"
        danger: token('danger'),  // cancelado, último cupo
        warn:   token('warn'),    // pendiente
        star:   token('star'),    // calificaciones
        info:   token('info'),    // completado

        // Versiones suaves, para fondos de aviso
        'live-soft':   token('live-soft'),
        'danger-soft': token('danger-soft'),
        'warn-soft':   token('warn-soft'),
        'info-soft':   token('info-soft'),

        // Burbuja de no leídos: idéntica en ambos temas, siempre con texto blanco
        notify: token('notify'),
      },
      boxShadow: {
        card:  '0 2px 10px rgb(var(--shadow) / 0.04)',
        float: '0 4px 20px rgb(var(--shadow) / 0.07), 0 1px 3px rgb(var(--shadow) / 0.04)',
        sheet: '0 -10px 30px -4px rgb(var(--shadow) / 0.12)',
        bar:   '0 -4px 16px rgb(var(--shadow) / 0.04)',
      },
      fontSize: {
        // Escala del rediseño. Antes casi todo vivía entre 11 y 16px, y esa
        // falta de contraste era una de las causas de que se viera plano.
        label: ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.06em', fontWeight: '700' }],
        hero:  ['1.5rem',   { lineHeight: '1.75rem',  letterSpacing: '-0.03em', fontWeight: '800' }],
        display: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.035em', fontWeight: '800' }],
      },
    },
  },
  plugins: [],
};
