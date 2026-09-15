import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = join(root, 'art-source', 'branding', 'mysterycases-logo.png')
const iconOutput = join(root, 'assets', 'branding', 'logo.png')
const pwaIconSourceOutput = join(root, 'public', 'mysterycases-icon-source.png')
const webLogoOutput = join(root, 'public', 'mysterycases-logo.webp')

await stat(source)
await Promise.all([mkdir(dirname(iconOutput), { recursive: true }), mkdir(dirname(pwaIconSourceOutput), { recursive: true }), mkdir(dirname(webLogoOutput), { recursive: true })])

// Crop the official artwork around the magnifying glass and puzzle, then leave
// transparent breathing room for adaptive masks and small launcher icons.
await sharp(source)
  .extract({ left: 300, top: 160, width: 650, height: 650 })
  .resize(820, 820, { fit: 'contain' })
  .extend({ top: 102, bottom: 102, left: 102, right: 102, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(iconOutput)

await sharp(source)
  .extract({ left: 300, top: 160, width: 650, height: 650 })
  .resize(410, 410, { fit: 'contain' })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(pwaIconSourceOutput)

await sharp(source)
  .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(webLogoOutput)

console.log('Branding derivatives generated.')
