/**
 * Phase 2: Design Token Architecture
 * Single source of truth for all colors in the app.
 */

// 1. Primitives (Theme-agnostic raw palette)
export const primitives = {
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  brand: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6', // Primary Brand (Purple)
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  success: {
    base: '#34d399',
    light: '#a7f3d0',
    dark: '#059669',
    bg: 'rgba(52, 211, 153, 0.15)',
  },
  error: {
    base: '#ef4444',
    light: '#fecaca',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.15)',
  },
  warning: {
    base: '#f59e0b',
    light: '#fde68a',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.15)',
  },
  info: {
    base: '#3b82f6',
    light: '#bfdbfe',
    dark: '#2563eb',
    bg: 'rgba(59, 130, 246, 0.15)',
  },
  transparent: 'transparent',
};

// 2. Semantic Tokens
export interface SemanticTokens {
  background: {
    primary: string;
    secondary: string;
    elevated: string;
    glass: string; // Used for GlassBackground/GlassCard
    glassBorder: string;
  };
  surface: {
    pressed: string;
    disabled: string;
    input: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    brand: string;
  };
  border: {
    default: string;
    subtle: string;
  };
  icon: {
    primary: string;
    secondary: string;
    inactive: string;
  };
  accent: {
    primary: string; // The main brand color used in buttons etc.
    onAccent: string; // Text color on top of primary accent
    secondary: string;
  };
  status: {
    success: string;
    error: string;
    warning: string;
    info: string;
    successBg: string;
    errorBg: string;
    warningBg: string;
    infoBg: string;
  };
  overlay: {
    scrim: string;
  };
  shadow: {
    color: string;
    opacity: number;
    elevation: number;
  };
}

export const lightTokens: SemanticTokens = {
  background: {
    primary: primitives.neutral[50], // Very light gray
    secondary: primitives.neutral[100],
    elevated: primitives.neutral[0], // Pure white
    glass: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.4)',
  },
  surface: {
    pressed: primitives.neutral[200],
    disabled: primitives.neutral[100],
    input: primitives.neutral[0],
  },
  text: {
    primary: primitives.neutral[900],
    secondary: primitives.neutral[600],
    tertiary: primitives.neutral[400],
    inverse: primitives.neutral[0],
    brand: primitives.brand[600], // Slightly darker brand for better contrast on light
  },
  border: {
    default: primitives.neutral[200],
    subtle: 'rgba(0, 0, 0, 0.05)',
  },
  icon: {
    primary: primitives.neutral[800],
    secondary: primitives.neutral[500],
    inactive: primitives.neutral[300],
  },
  accent: {
    primary: primitives.brand[500],
    onAccent: primitives.neutral[0],
    secondary: primitives.brand[100],
  },
  status: {
    success: primitives.success.dark,
    error: primitives.error.dark,
    warning: primitives.warning.dark,
    info: primitives.info.dark,
    successBg: primitives.success.bg,
    errorBg: primitives.error.bg,
    warningBg: primitives.warning.bg,
    infoBg: primitives.info.bg,
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  shadow: {
    color: '#000000',
    opacity: 0.1, // Real shadows for light mode
    elevation: 4,
  },
};

export const darkTokens: SemanticTokens = {
  background: {
    primary: primitives.neutral[900], // Darkest bg
    secondary: primitives.neutral[800],
    elevated: primitives.neutral[800],
    glass: 'rgba(30, 41, 59, 0.5)',
    glassBorder: 'rgba(255, 255, 255, 0.05)',
  },
  surface: {
    pressed: primitives.neutral[700],
    disabled: primitives.neutral[800],
    input: primitives.neutral[800],
  },
  text: {
    primary: primitives.neutral[0], // Pure white
    secondary: primitives.neutral[300],
    tertiary: primitives.neutral[500],
    inverse: primitives.neutral[900],
    brand: primitives.brand[400],
  },
  border: {
    default: primitives.neutral[700],
    subtle: 'rgba(255, 255, 255, 0.05)',
  },
  icon: {
    primary: primitives.neutral[0],
    secondary: primitives.neutral[400],
    inactive: primitives.neutral[600],
  },
  accent: {
    primary: primitives.brand[500],
    onAccent: primitives.neutral[0],
    secondary: 'rgba(139, 92, 246, 0.15)', // brand.500 with opacity
  },
  status: {
    success: primitives.success.base, // Brighter for dark mode
    error: primitives.error.base,
    warning: primitives.warning.base,
    info: primitives.info.base,
    successBg: primitives.success.bg,
    errorBg: primitives.error.bg,
    warningBg: primitives.warning.bg,
    infoBg: primitives.info.bg,
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
  shadow: {
    color: '#000000',
    opacity: 0.3, // Dark mode needs higher opacity for shadows or relies on surface lightness
    elevation: 4,
  },
};
