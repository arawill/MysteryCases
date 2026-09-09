import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = join(process.cwd(), 'dist')
const fail = message => { console.error(`PWA verification failed: ${message}`); process.exitCode = 1 }
const files = directory => readdirSync(directory).flatMap(entry => {
  const path = join(directory, entry)
  return statSync(path).isDirectory() ? files(path) : [path]
})

if (!existsSync(dist)) {
  fail('dist directory is missing.')
} else {
  const manifestPath = join(dist, 'manifest.webmanifest')
  const serviceWorkerPath = join(dist, 'sw.js')
  if (!existsSync(manifestPath)) fail('manifest.webmanifest is missing.')
  if (!existsSync(serviceWorkerPath)) fail('sw.js is missing.')
  if (existsSync(manifestPath)) {
    let manifest
    try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { fail('manifest.webmanifest is not valid JSON.') }
    if (manifest) {
      if (manifest.name !== 'MysteryCases') fail('manifest name is not MysteryCases.')
      if (manifest.display !== 'standalone') fail('manifest display is not standalone.')
      const icons = Array.isArray(manifest.icons) ? manifest.icons : []
      const hasIcon = size => icons.some(icon => icon.sizes === size)
      const hasMaskable = icons.some(icon => icon.sizes === '512x512' && typeof icon.purpose === 'string' && icon.purpose.includes('maskable'))
      if (!hasIcon('192x192')) fail('manifest is missing a 192x192 icon.')
      if (!hasIcon('512x512')) fail('manifest is missing a 512x512 icon.')
      if (!hasMaskable) fail('manifest is missing a maskable 512x512 icon.')
      for (const icon of icons) if (typeof icon.src !== 'string' || !existsSync(join(dist, icon.src.replace(/^\//, '')))) fail(`manifest icon is missing: ${String(icon.src)}.`)
    }
  }
  const outputFiles = files(dist)
  const fonts = outputFiles.filter(file => /\.woff2?$/i.test(file))
  if (fonts.length === 0) fail('no local WOFF or WOFF2 fonts were emitted.')
  const runtimeAssets = outputFiles.filter(file => /\.(?:html|css|js)$/i.test(file))
  for (const asset of runtimeAssets) {
    const content = readFileSync(asset, 'utf8')
    if (/fonts\.(?:googleapis|gstatic)\.com/i.test(content)) fail(`external Google Fonts reference found in ${relative(dist, asset)}.`)
  }
  const workerAssets = outputFiles.filter(file => /(?:sw|workbox).*\.js$/i.test(file))
  if (!workerAssets.some(file => /\.woff2?/i.test(readFileSync(file, 'utf8')))) fail('service worker precache does not reference local fonts.')
}

if (process.exitCode) process.exit(process.exitCode)
console.log('PWA build verification passed.')
