import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { AboutScreen } from './screens/AboutScreen'
import { GameScreen } from './screens/GameScreen'
import { HelpScreen } from './screens/HelpScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { DailyScreen } from './screens/DailyScreen'
import { loadSettings } from './game/persistence/settings'
import { case001 } from './data/cases/case001'
import { applyTheme, isTheme, type Theme } from './theme'

function ThemeController() {
  useEffect(() => {
    const readTheme = (): Theme => loadSettings().theme
    let theme = readTheme()
    let media: MediaQueryList | null = null
    let onMediaChange: (() => void) | null = null
    const bind = (nextTheme: Theme) => { theme = nextTheme; applyTheme(theme); if (media && onMediaChange) media.removeEventListener('change', onMediaChange); media = null; onMediaChange = null; if (theme === 'system') { media = window.matchMedia('(prefers-color-scheme: light)'); onMediaChange = () => applyTheme('system'); media.addEventListener('change', onMediaChange) } }
    bind(theme)
    const onThemeChange = (event: Event) => { const value = (event as CustomEvent<unknown>).detail; bind(isTheme(value) ? value : 'dark') }
    window.addEventListener('mystery-theme-change', onThemeChange)
    return () => { window.removeEventListener('mystery-theme-change', onThemeChange); if (media && onMediaChange) media.removeEventListener('change', onMediaChange) }
  }, [])
  return null
}
function CaseRoute() { return <div className="case-route"><AppHeader back/><GameScreen gameCase={case001}/></div> }
export default function App() { return <BrowserRouter><ThemeController/><Routes><Route path="/" element={<HomeScreen/>}/><Route path="/daily" element={<DailyScreen/>}/><Route path="/case/case001" element={<CaseRoute/>}/><Route path="/settings" element={<SettingsScreen/>}/><Route path="/help" element={<HelpScreen/>}/><Route path="/about" element={<AboutScreen/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter> }
