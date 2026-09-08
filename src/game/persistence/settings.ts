import { isTheme, SETTINGS_KEY, type Theme } from '../../theme'
export interface AppSettings { saveVersion: 1; theme: Theme; autoCrossout: boolean }
const defaults = (): AppSettings => ({ saveVersion: 1, theme: 'dark', autoCrossout: false })
export function loadSettings(storage: Storage = localStorage): AppSettings { try { const value: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null'); if (!value || typeof value !== 'object') return defaults(); const data = value as { theme?: unknown; autoCrossout?: unknown }; return { saveVersion: 1, theme: isTheme(data.theme) ? data.theme : 'dark', autoCrossout: typeof data.autoCrossout === 'boolean' ? data.autoCrossout : false } } catch { return defaults() } }
export function saveSettings(settings: AppSettings, storage: Storage = localStorage) { storage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings })) }
export function updateSettings(changes: Partial<Omit<AppSettings, 'saveVersion'>>, storage: Storage = localStorage) { const next = { ...loadSettings(storage), ...changes, saveVersion: 1 as const }; saveSettings(next, storage); return next }
