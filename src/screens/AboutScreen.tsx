import { AppHeader } from '../components/AppHeader'

const brandIcon = `${import.meta.env.BASE_URL}pwa-192x192.png`

export function AboutScreen() {
  return <main className="simple-screen about-screen">
    <AppHeader back />
    <section className="about-card">
      <p className="eyebrow">ARCHIVO PRIVADO</p>
      <h1>SOBRE MYSTERYCASES</h1>
      <div className="about-mark"><img src={brandIcon} alt="" /></div>
      <h2>MysteryCases</h2>
      <p>Un juego de investigación y deducción creado con mucho cariño.</p>
      <p>Desarrollado por Felix.</p>
      <span className="version">VERSIÓN 1.0.0</span>
    </section>
  </main>
}
