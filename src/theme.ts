export type Theme = 'dark' | 'light' | 'system'
export const SETTINGS_KEY = 'mystery-cases-settings'
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme }
