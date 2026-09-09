import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const root = process.cwd()
const fromRoot = (...parts) => resolve(root, ...parts)
const failures = []

const appBuildGradle = fromRoot('android', 'app', 'build.gradle')
const capacitorConfig = fromRoot('capacitor.config.ts')
const gitignorePath = fromRoot('.gitignore')
const releaseApk = fromRoot('android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')

for (const filePath of [appBuildGradle, capacitorConfig, gitignorePath]) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required file: ${filePath}`)
  }
}

if (existsSync(appBuildGradle)) {
  const gradle = readFileSync(appBuildGradle, 'utf8')
  for (const expected of [
    'applicationId "com.mysterycases.app"',
    'versionCode 1',
    'versionName "1.0.0"',
    'signingConfigs',
    'signingConfig signingConfigs.release',
  ]) {
    if (!gradle.includes(expected)) {
      failures.push(`Android release configuration is missing: ${expected}`)
    }
  }
}

if (existsSync(capacitorConfig)) {
  const config = readFileSync(capacitorConfig, 'utf8')
  if (/server\s*:\s*\{[\s\S]*?url\s*:/.test(config)) {
    failures.push('Capacitor config must not define server.url.')
  }
}

if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, 'utf8')
  for (const expected of ['*.jks', '*.keystore', 'android/keystore.properties', 'android/keystore/', 'release/']) {
    if (!gitignore.includes(expected)) {
      failures.push(`.gitignore must include ${expected}`)
    }
  }
}

try {
  execFileSync('git', ['ls-files', '--error-unmatch', 'android/keystore.properties'], {
    cwd: root,
    stdio: 'ignore',
  })
  failures.push('android/keystore.properties must remain untracked.')
} catch {
  // Expected: the local signing configuration is not tracked.
}

const findApkSigner = () => {
  const sdkRoot = process.env.ANDROID_HOME
    ?? process.env.ANDROID_SDK_ROOT
    ?? (process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined)

  if (!sdkRoot) {
    return undefined
  }

  const buildToolsDirectory = resolve(sdkRoot, 'build-tools')
  if (!existsSync(buildToolsDirectory)) {
    return undefined
  }

  const binary = process.platform === 'win32' ? 'apksigner.bat' : 'apksigner'
  const versions = readdirSync(buildToolsDirectory).sort().reverse()
  return versions
    .map((version) => resolve(buildToolsDirectory, version, binary))
    .find((candidate) => existsSync(candidate))
}

const verifyApkSignature = (apksigner, apkPath) => {
  const args = ['verify', '--verbose', apkPath]

  if (process.platform !== 'win32') {
    return spawnSync(apksigner, args, { encoding: 'utf8' })
  }

  return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'call', apksigner, ...args], { encoding: 'utf8' })
}

if (existsSync(releaseApk)) {
  if (statSync(releaseApk).size <= 0) {
    failures.push('Release APK exists but is empty.')
  } else {
    const apksigner = findApkSigner()
    if (apksigner) {
      const verification = verifyApkSignature(apksigner, releaseApk)
      if (verification.error) {
        failures.push(`Could not launch apksigner: ${verification.error.message}`)
      } else if (verification.status !== 0) {
        const output = [verification.stderr, verification.stdout]
          .filter((value) => value?.trim())
          .join('\n')
        const reason = output || `Process exited with status ${verification.status ?? 'unknown'}.`
        failures.push(`Release APK signature verification failed: ${reason}`)
      }
    } else {
      console.log('apksigner was not found; skipped APK signature verification.')
    }
  }
} else {
  console.log('Release APK has not been built yet; static release configuration verified.')
}

if (failures.length > 0) {
  console.error('Android release verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Android release verification passed.')
