import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { DailyCaseCard } from '../components/DailyCaseCard'
import { ExtraCaseCard } from '../components/ExtraCaseCard'
import { NormalModeCard } from '../components/NormalModeCard'
import { formatDailyDate, getDailyCaseId } from '../game/daily/date'
import { loadNormalProgress } from '../game/persistence/normalProgress'
import { isCaseCompleted } from '../game/persistence/progress'

export function HomeScreen() { const today = new Date(); return <main className="home-screen"><AppHeader/><section className="home-hero"><p className="eyebrow">ARCHIVO PRIVADO DE INVESTIGACIONES</p><h1>Reconstruye la escena.<br/><span>Encuentra al culpable.</span></h1><p>Un juego de deducción espacial para mentes observadoras.</p></section><section><div className="section-heading"><div><p className="eyebrow">EXPEDIENTE DE HOY</p><h2>Caso diario</h2></div></div><DailyCaseCard dateLabel={formatDailyDate(today)} completed={isCaseCompleted(getDailyCaseId(today))}/></section><section><div className="section-heading"><div><p className="eyebrow">ELIGE TU INVESTIGACIÓN</p><h2>Casos a investigar</h2></div></div><NormalModeCard progress={loadNormalProgress()}/></section><section><div className="section-heading"><div><p className="eyebrow">ARCHIVOS SELLADOS</p><h2>Casos extra</h2></div></div><div className="extra-grid">{Array.from({ length: 4 }, (_, index) => <ExtraCaseCard key={index}/>)}</div></section><nav className="secondary-nav" aria-label="Menú principal"><Link to="/settings">OPCIONES</Link><Link to="/help">AYUDA</Link><Link to="/about">SOBRE MYSTERYCASES</Link></nav><footer>Una historia original</footer></main> }
