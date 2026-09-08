import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { generateDailyCase } from '../game/daily/generator'
import { getDailyCaseId } from '../game/daily/date'
import { isCaseCompleted } from '../game/persistence/progress'
import { GameScreen } from './GameScreen'
export function DailyScreen() { const date = new Date(); if (isCaseCompleted(getDailyCaseId(date))) return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO COMPLETADO</p><h1>Expediente cerrado</h1><p>Ya has resuelto el expediente de hoy. Vuelve mañana para un nuevo caso.</p><Link className="primary" to="/">VOLVER AL INICIO</Link></section></main>; const daily = generateDailyCase(date); return <div className="case-route"><AppHeader back/><GameScreen gameCase={daily.caseData}/></div> }
