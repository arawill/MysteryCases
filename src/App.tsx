import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { AboutScreen } from './screens/AboutScreen'
import { GameScreen } from './screens/GameScreen'
import { HelpScreen } from './screens/HelpScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { applyTheme, SETTINGS_KEY, type Theme } from './theme'
function CaseRoute() { return <div className="case-route"><AppHeader back/><GameScreen/></div> }
export default function App() { useEffect(() => { try { applyTheme(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').theme as Theme ?? 'dark') } catch { applyTheme('dark') } }, []); return <BrowserRouter><Routes><Route path="/" element={<HomeScreen/>}/><Route path="/case/case001" element={<CaseRoute/>}/><Route path="/settings" element={<SettingsScreen/>}/><Route path="/help" element={<HelpScreen/>}/><Route path="/about" element={<AboutScreen/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter> }
