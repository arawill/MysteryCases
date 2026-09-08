import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import './styles/final.css'
import { AppHeader } from './components/AppHeader'
import { case001 } from './data/cases/case001'
import { loadSettings } from './game/persistence/settings'
import { AboutScreen } from './screens/AboutScreen'
import { DailyScreen } from './screens/DailyScreen'
import { GameScreen } from './screens/GameScreen'
import { HelpScreen } from './screens/HelpScreen'
import { HomeScreen } from './screens/HomeScreen'
import { InfiniteScreen } from './screens/InfiniteScreen'
import { NormalCaseScreen } from './screens/NormalCaseScreen'
import { NormalCasesScreen } from './screens/NormalCasesScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { applyTheme, isTheme, type Theme } from './theme'

function ThemeController() {
  useEffect(() => {
    let media: MediaQueryList | null = null
    let onMediaChange: (() => void) | null = null
    const bind = (theme: Theme) => {
      applyTheme(theme)
      if (media && onMediaChange) media.removeEventListener('change', onMediaChange)
      media = null
      onMediaChange = null
      if (theme === 'system') {
        media = window.matchMedia('(prefers-color-scheme: light)')
        onMediaChange = () => applyTheme('system')
        media.addEventListener('change', onMediaChange)
      }
    }
    bind(loadSettings().theme)
    const onThemeChange = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail
      bind(isTheme(value) ? value : 'dark')
    }
    window.addEventListener('mystery-theme-change', onThemeChange)
    return () => { window.removeEventListener('mystery-theme-change', onThemeChange); if (media && onMediaChange) media.removeEventListener('change', onMediaChange) }
  }, [])
  return null
}

function CaseRoute() { return <div className="case-route"><AppHeader back /><GameScreen gameCase={case001} /></div> }

export default function App() {
  return <BrowserRouter><ThemeController /><Routes>
    <Route path="/" element={<HomeScreen />} />
    <Route path="/daily" element={<DailyScreen />} />
    <Route path="/normal" element={<NormalCasesScreen />} />
    <Route path="/normal/:difficulty/:caseNumber" element={<NormalCaseScreen />} />
    <Route path="/infinite" element={<InfiniteScreen />} />
    <Route path="/case/case001" element={<CaseRoute />} />
    <Route path="/stats" element={<StatsScreen />} />
    <Route path="/settings" element={<SettingsScreen />} />
    <Route path="/help" element={<HelpScreen />} />
    <Route path="/about" element={<AboutScreen />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>
}
