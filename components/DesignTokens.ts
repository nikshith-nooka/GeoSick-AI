/**
 * GeoSick AI — Unified Design Tokens & Aesthetic System
 * 
 * Standardizes typography, colors, shadows, glassmorphic surfaces,
 * radii, and animation presets across the entire clinical and surveillance platform.
 */

export const DesignTokens = {
  colors: {
    brand: {
      primary: '#3b82f6', // blue-500
      primaryHover: '#2563eb', // blue-600
      primaryLight: '#eff6ff', // blue-50
      secondary: '#0f172a', // slate-900
      accent: '#06b6d4', // cyan-500
    },
    clinical: {
      emergency: '#ef4444', // red-500
      urgent: '#f59e0b', // amber-500
      routine: '#10b981', // emerald-500
      info: '#6366f1', // indigo-500
    },
    surfaces: {
      background: '#f8fafc', // slate-50
      card: '#ffffff',
      cardBorder: 'rgba(226, 232, 240, 0.8)', // slate-200/80
      darkCard: 'rgba(15, 23, 42, 0.95)', // slate-900/95
    },
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#475569', // slate-600
      muted: '#94a3b8', // slate-400
      inverse: '#ffffff',
    }
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    scale: {
      display: 'text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight',
      h1: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-900',
      h2: 'text-xl sm:text-2xl font-bold text-slate-900',
      h3: 'text-lg font-semibold text-slate-800',
      body: 'text-sm text-slate-600 leading-relaxed',
      caption: 'text-xs text-slate-500 font-medium',
      badge: 'text-[11px] font-bold uppercase tracking-wider',
    }
  },
  radii: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    full: 'rounded-full',
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md transition-shadow duration-200',
    elevated: 'shadow-xl shadow-blue-950/5 border border-slate-200/80',
    modal: 'shadow-2xl shadow-slate-950/20',
  },
  glassmorphism: {
    light: 'bg-white/85 backdrop-blur-md border border-white/60 shadow-lg',
    dark: 'bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-2xl',
    panel: 'bg-white/95 backdrop-blur-xl border-l border-slate-200/80',
  },
  buttons: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98]',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl transition-all duration-200',
    emergency: 'bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-lg shadow-red-900/20 active:scale-[0.98]',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-xl transition-colors',
  }
} as const;

export default DesignTokens;
