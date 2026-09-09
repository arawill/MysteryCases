import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const sourceApk = resolve(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const releaseDirectory = resolve(root, 'release')
const destinationApk = resolve(releaseDirectory, 'MysteryCases.apk')

if (!existsSync(sourceApk) || statSync(sourceApk).size <= 0) {
  console.error('Release APK is missing. Run npm run android:build:release after configuring signing first.')
  process.exit(1)
}

mkdirSync(releaseDirectory, { recursive: true })
copyFileSync(sourceApk, destinationApk)
console.log(`Prepared release APK: ${destinationApk}`)
