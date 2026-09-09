import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const fromRoot = (...parts) => resolve(root, ...parts)
const failures = []

const requireFile = (relativePath, label = relativePath) => {
  if (!existsSync(fromRoot(relativePath))) {
    failures.push(`Missing ${label}: ${relativePath}`)
  }
}

const configPath = fromRoot('capacitor.config.ts')
requireFile('capacitor.config.ts')

if (existsSync(configPath)) {
  const config = readFileSync(configPath, 'utf8')
  for (const [setting, expected] of [
    ['appId', 'com.mysterycases.app'],
    ['appName', 'MysteryCases'],
    ['webDir', 'dist'],
  ]) {
    if (!config.includes(`${setting}: '${expected}'`)) {
      failures.push(`Capacitor config must contain ${setting}: '${expected}'.`)
    }
  }

  if (/server\s*:\s*\{[\s\S]*?url\s*:/.test(config)) {
    failures.push('Capacitor config must not define server.url.')
  }
}

requireFile('android', 'Android project directory')
requireFile('android/app/src/main/AndroidManifest.xml')
requireFile('android/build.gradle', 'Gradle root build file')
requireFile('android/app/build.gradle', 'Gradle app build file')
requireFile('android/settings.gradle')
requireFile('android/gradlew.bat')
requireFile('android/app/src/main/assets/public/index.html', 'synchronised web index')
requireFile('android/app/src/main/res/values/strings.xml', 'Android app strings')

const manifestPath = fromRoot('android/app/src/main/AndroidManifest.xml')
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, 'utf8')
  const sensitivePermissions = [
    'android.permission.CAMERA',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.POST_NOTIFICATIONS',
  ]

  for (const permission of sensitivePermissions) {
    if (manifest.includes(permission)) {
      failures.push(`Unexpected sensitive Android permission: ${permission}`)
    }
  }
}

const stringsPath = fromRoot('android/app/src/main/res/values/strings.xml')
if (existsSync(stringsPath)) {
  const strings = readFileSync(stringsPath, 'utf8')
  if (!strings.includes('<string name="app_name">MysteryCases</string>')) {
    failures.push('Android app label must be MysteryCases.')
  }
}

const apkPath = fromRoot('android/app/build/outputs/apk/debug/app-debug.apk')
if (existsSync(apkPath) && statSync(apkPath).size <= 0) {
  failures.push('Debug APK exists but is empty.')
}

if (failures.length > 0) {
  console.error('Android build verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Android project verification passed.')
