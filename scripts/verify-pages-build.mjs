import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const base = '/MysteryCases/'
const fail = message => {
  console.error(`Pages build verification failed: ${message}`)
  process.exitCode = 1
}

const indexPath = join(dist, 'index.html')
const manifestPath = join(dist, 'manifest.webmanifest')
const serviceWorkerPath = join(dist, 'sw.js')

for (const path of [indexPath, manifestPath, serviceWorkerPath]) {
  if (!existsSync(path)) fail(`Missing ${path.replace(`${dist}\\`, '')}.`)
}

if (existsSync(indexPath)) {
  const index = readFileSync(indexPath, 'utf8')
  if (!index.includes(base)) fail(`index.html does not reference the Pages base ${base}.`)
  if (/(["'])\/assets\//.test(index)) fail('index.html contains an absolute /assets/ reference.')
}

if (existsSync(manifestPath)) {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    fail('manifest.webmanifest is not valid JSON.')
  }
  if (manifest?.start_url !== base) fail(`manifest start_url must be ${base}.`)
  if (manifest?.scope !== base) fail(`manifest scope must be ${base}.`)
}

if (process.exitCode) process.exit(process.exitCode)
console.log('GitHub Pages build verification passed.')
