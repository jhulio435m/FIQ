/**
 * Paleta de colores oficial — Facultad de Ingeniería Química (FIQ) UNCP
 *
 * Fuente: https://quimica.uncp.edu.pe/
 * El color institucional es brand-500 (#ac2c2d), un rojo granate.
 *
 * Uso en Tailwind:
 *   bg-brand-500, text-brand-900, hover:bg-brand-600, etc.
 */

export const brand = {
  50: '#fbf4f4',
  100: '#f6e4e5',
  200: '#edccd0',
  300: '#dfa6ac',
  400: '#ca757d',
  500: '#ac2c2d', // Primario — rojo institucional FIQ
  600: '#8e2024', // Hover / active
  700: '#751a1e',
  800: '#63181b',
  900: '#54171a',
  950: '#2e0a0c',
} as const;

export const colors = {
  brand,
} as const;

export type BrandColor = keyof typeof brand;
