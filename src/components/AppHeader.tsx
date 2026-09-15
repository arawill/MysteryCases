import { Link } from 'react-router-dom'

const brandIcon = `${import.meta.env.BASE_URL}pwa-192x192.png`

export function AppHeader({ back = false }: { back?: boolean }) {
  return <header className="app-header">
    <Link to="/" className="brand-link" aria-label="Volver al archivo">
      <span className="brand-mark"><img src={brandIcon} alt="" /></span>
      <span>MYSTERYCASES</span>
    </Link>
    <span className="header-label">ARCHIVO DE MISTERIOS</span>
    {back && <Link className="back-link" to="/">← VOLVER AL ARCHIVO</Link>}
  </header>
}
