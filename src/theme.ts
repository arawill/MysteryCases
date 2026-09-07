export type Theme = 'dark' | 'light' | 'system'
export const SETTINGS_KEY = 'mystery-cases-settings'
export function isTheme(value: unknown): value is Theme { return value === 'dark' || value === 'light' || value === 'system' }
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme }
