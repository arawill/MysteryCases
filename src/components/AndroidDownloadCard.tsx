import { Capacitor } from '@capacitor/core'
import { ANDROID_APK_DOWNLOAD_URL } from '../config/android'

export function AndroidDownloadCard() {
  if (Capacitor.isNativePlatform()) return null

  return <section className="android-download-card" aria-labelledby="android-download-title">
    <div className="android-download-copy">
      <p className="eyebrow">APLICACIÓN DE CAMPO</p>
      <h2 id="android-download-title">MysteryCases para Android</h2>
      <p>Instala el archivo de investigación en tu dispositivo y juega incluso sin conexión.</p>
      <small>APK · Android 7.0 o superior</small>
    </div>
    <a className="primary android-download-link" href={ANDROID_APK_DOWNLOAD_URL}>DESCARGAR PARA ANDROID <span aria-hidden="true">↓</span></a>
  </section>
}
