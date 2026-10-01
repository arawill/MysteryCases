import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

const RELEASE_APK = join('android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const SYNCED_PUBLIC = join('android', 'app', 'src', 'main', 'assets', 'public')
const WORKER_PATTERN = /^assets\/proceduralGeneration\.worker-[^/]+\.js$/

export class AndroidReleaseVerificationError extends Error {
  constructor(failures) {
    super('Android release verification failed.')
    this.name = 'AndroidReleaseVerificationError'
    this.failures = failures
  }
}

const quotePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const readMatch = (text, pattern, description, failures) => {
  const match = text.match(pattern)
  if (!match) {
    failures.push(`Could not read ${description}.`)
    return undefined
  }
  return match[1]
}

export const hashFile = (filePath) => {
  const hash = createHash('sha256')
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  const descriptor = openSync(filePath, 'r')
  try {
    let bytesRead
    do {
      bytesRead = readSync(descriptor, buffer, 0, buffer.length, null)
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead))
    } while (bytesRead > 0)
  } finally {
    closeSync(descriptor)
  }
  return hash.digest('hex')
}

const listFiles = (directory, prefix = '') => {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      const absolutePath = join(directory, entry.name)
      return entry.isDirectory() ? listFiles(absolutePath, relativePath) : [relativePath]
    })
    .sort()
}

const executableName = (name) => process.platform === 'win32' ? `${name}.exe` : name

const newestBuildTool = (sdkRoots, names) => {
  for (const sdkRoot of sdkRoots) {
    const buildTools = join(sdkRoot, 'build-tools')
    if (!existsSync(buildTools)) continue
    const versions = readdirSync(buildTools, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
    for (const version of versions) {
      for (const name of names) {
        const candidate = join(buildTools, version, name)
        if (existsSync(candidate)) return candidate
      }
    }
  }
  return undefined
}

const findOnPath = (name) => {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which'
  const result = spawnSync(locator, [name], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) return undefined
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
}

export const discoverAndroidReleaseTools = () => {
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined,
  ].filter((value, index, values) => value && values.indexOf(value) === index)
  const apksignerName = process.platform === 'win32' ? 'apksigner.bat' : 'apksigner'
  const aaptNames = process.platform === 'win32' ? ['aapt2.exe', 'aapt.exe'] : ['aapt2', 'aapt']
  const javaHomeJar = process.env.JAVA_HOME
    ? join(process.env.JAVA_HOME, 'bin', executableName('jar'))
    : undefined
  const androidStudioJar = process.platform === 'win32'
    ? join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Android', 'Android Studio', 'jbr', 'bin', 'jar.exe')
    : undefined
  return {
    apksigner: newestBuildTool(sdkRoots, [apksignerName]),
    aapt: newestBuildTool(sdkRoots, aaptNames),
    jar: [javaHomeJar, androidStudioJar].find((candidate) => candidate && existsSync(candidate))
      ?? findOnPath(executableName('jar')),
  }
}

export const runReleaseTool = (command, args, options = {}) => {
  const spawnOptions = { cwd: options.cwd, encoding: 'utf8', windowsHide: true }
  if (process.platform === 'win32' && /\.(?:bat|cmd)$/i.test(command)) {
    return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'call', command, ...args], spawnOptions)
  }
  return spawnSync(command, args, spawnOptions)
}

const toolSucceeded = (result) => !result.error && result.status === 0

const toolFailure = (name, result) => {
  if (result.error) return `${name} could not be launched: ${result.error.message}`
  return `${name} exited with status ${result.status ?? 'unknown'}.`
}

const parseProjectIdentity = (root, failures) => {
  const required = {
    packageJson: join(root, 'package.json'),
    gradle: join(root, 'android', 'app', 'build.gradle'),
    capacitor: join(root, 'capacitor.config.ts'),
    gitignore: join(root, '.gitignore'),
  }
  for (const [name, filePath] of Object.entries(required)) {
    if (!existsSync(filePath)) failures.push(`Missing required project file: ${name}.`)
  }
  if (failures.length > 0) return undefined

  let packageJson
  try {
    packageJson = JSON.parse(readFileSync(required.packageJson, 'utf8'))
  } catch {
    failures.push('package.json is not valid JSON.')
    return undefined
  }
  const version = typeof packageJson.version === 'string' && packageJson.version.trim()
    ? packageJson.version.trim()
    : undefined
  if (!version) failures.push('package.json does not define a non-empty version.')

  const gradle = readFileSync(required.gradle, 'utf8')
  const packageId = readMatch(gradle, /\bapplicationId\s*[=(]?\s*["']([^"']+)["']/, 'Android applicationId', failures)
  const versionCodeText = readMatch(gradle, /\bversionCode\s*[=(]?\s*(\d+)/, 'Android versionCode', failures)
  const versionName = readMatch(gradle, /\bversionName\s*[=(]?\s*["']([^"']+)["']/, 'Android versionName', failures)
  const versionCode = versionCodeText ? Number.parseInt(versionCodeText, 10) : undefined
  if (version && versionName && versionName !== version) {
    failures.push(`Gradle versionName ${versionName} does not match canonical project version ${version}.`)
  }
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0) {
    failures.push('Android versionCode must be a positive integer.')
  }
  for (const expected of ['signingConfigs', 'signingConfig signingConfigs.release']) {
    if (!gradle.includes(expected)) failures.push(`Android release configuration is missing: ${expected}.`)
  }

  const capacitor = readFileSync(required.capacitor, 'utf8')
  const capacitorAppId = readMatch(capacitor, /\bappId\s*:\s*["']([^"']+)["']/, 'Capacitor appId', failures)
  if (packageId && capacitorAppId && packageId !== capacitorAppId) {
    failures.push(`Gradle applicationId ${packageId} does not match Capacitor appId ${capacitorAppId}.`)
  }
  if (/\bserver\s*:\s*\{[\s\S]*?\burl\s*:/.test(capacitor)) {
    failures.push('Capacitor config must not define server.url.')
  }

  const gitignore = readFileSync(required.gitignore, 'utf8')
  for (const expected of ['*.jks', '*.keystore', 'android/keystore.properties', 'android/keystore/', 'release/']) {
    if (!gitignore.includes(expected)) failures.push(`.gitignore must include ${expected}.`)
  }
  return version && packageId && versionName && versionCode
    ? { version, packageId, versionCode }
    : undefined
}

const defaultIsTracked = (root, relativePath) => spawnSync(
  'git',
  ['ls-files', '--error-unmatch', relativePath],
  { cwd: root, encoding: 'utf8', windowsHide: true },
).status === 0

const parseBadging = (output, failures) => {
  const packageLine = output.split(/\r?\n/).find((line) => line.startsWith('package:'))
  if (!packageLine) {
    failures.push('aapt did not report APK package metadata.')
    return undefined
  }
  const value = (name) => packageLine.match(new RegExp(`${quotePattern(name)}='([^']*)'`))?.[1]
  const packageId = value('name')
  const versionName = value('versionName')
  const versionCodeText = value('versionCode')
  if (!packageId || !versionName || !versionCodeText) {
    failures.push('aapt returned incomplete APK package metadata.')
    return undefined
  }
  return { packageId, versionName, versionCode: Number.parseInt(versionCodeText, 10) }
}

const isUnsafeArchiveEntry = (entry) => {
  const normalized = entry.replaceAll('\\', '/')
  return isAbsolute(entry)
    || normalized.startsWith('/')
    || /^[A-Za-z]:\//.test(normalized)
    || normalized.split('/').includes('..')
}

const compareAssets = (sourceDirectory, packagedDirectory, failures) => {
  const sourceFiles = listFiles(sourceDirectory)
  const packagedFiles = listFiles(packagedDirectory)
  const sourceSet = new Set(sourceFiles)
  const packagedSet = new Set(packagedFiles)
  const missing = sourceFiles.filter((file) => !packagedSet.has(file))
  const extra = packagedFiles.filter((file) => !sourceSet.has(file))
  const different = sourceFiles.filter((file) => packagedSet.has(file)
    && hashFile(join(sourceDirectory, ...file.split('/'))) !== hashFile(join(packagedDirectory, ...file.split('/'))))
  if (missing.length > 0) failures.push(`APK assets are missing ${missing.length} file(s): ${missing.join(', ')}.`)
  if (extra.length > 0) failures.push(`APK assets contain ${extra.length} unexpected file(s): ${extra.join(', ')}.`)
  if (different.length > 0) failures.push(`APK assets differ in ${different.length} file(s): ${different.join(', ')}.`)

  const sourceWorkers = sourceFiles.filter((file) => WORKER_PATTERN.test(file))
  const packagedWorkers = packagedFiles.filter((file) => WORKER_PATTERN.test(file))
  if (sourceWorkers.length !== 1) {
    failures.push(`Synced assets must contain exactly one procedural Worker chunk; found ${sourceWorkers.length}.`)
  }
  if (packagedWorkers.length !== 1) {
    failures.push(`Release APK must contain exactly one procedural Worker chunk; found ${packagedWorkers.length}.`)
  }
  if (sourceWorkers.length === 1 && packagedWorkers.length === 1) {
    if (sourceWorkers[0] !== packagedWorkers[0]) {
      failures.push(`Release APK contains stale procedural Worker chunk ${packagedWorkers[0]}; expected ${sourceWorkers[0]}.`)
    } else if (hashFile(join(sourceDirectory, ...sourceWorkers[0].split('/')))
      !== hashFile(join(packagedDirectory, ...packagedWorkers[0].split('/')))) {
      failures.push(`Release APK procedural Worker bytes differ for ${sourceWorkers[0]}.`)
    }
  }
  return { sourceFiles, sourceWorkers }
}

export const verifyAndroidRelease = (options = {}) => {
  const root = resolve(options.root ?? process.cwd())
  const failures = []
  const identity = parseProjectIdentity(root, failures)
  const apkPath = resolve(options.apkPath ?? join(root, RELEASE_APK))
  const publicDirectory = resolve(options.publicDirectory ?? join(root, SYNCED_PUBLIC))
  const tools = options.tools ?? discoverAndroidReleaseTools()
  const runCommand = options.runCommand ?? runReleaseTool
  const isTracked = options.isTracked ?? ((relativePath) => defaultIsTracked(root, relativePath))

  if (isTracked('android/keystore.properties')) failures.push('android/keystore.properties must remain untracked.')
  if (!existsSync(apkPath)) failures.push('Release APK is missing.')
  else if (statSync(apkPath).size <= 0) failures.push('Release APK is empty.')
  if (!existsSync(publicDirectory)) failures.push('Synced Android public assets are missing.')
  if (!tools.apksigner) failures.push('apksigner is required but was not found.')
  if (!tools.aapt) failures.push('aapt/aapt2 is required but was not found.')
  if (!tools.jar) failures.push('jar is required but was not found.')

  const usableApk = existsSync(apkPath) && statSync(apkPath).size > 0
  if (usableApk && tools.apksigner) {
    const signature = runCommand(tools.apksigner, ['verify', '--verbose', apkPath])
    if (!toolSucceeded(signature)) failures.push(`Release APK signature verification failed: ${toolFailure('apksigner', signature)}`)
  }

  if (usableApk && tools.aapt) {
    const badging = runCommand(tools.aapt, ['dump', 'badging', apkPath])
    if (!toolSucceeded(badging)) {
      failures.push(`Could not read release APK metadata: ${toolFailure('aapt', badging)}`)
    } else {
      const metadata = parseBadging(badging.stdout, failures)
      if (identity && metadata) {
        if (metadata.packageId !== identity.packageId) failures.push(`APK package ${metadata.packageId} does not match expected ${identity.packageId}.`)
        if (metadata.versionName !== identity.version) failures.push(`APK versionName ${metadata.versionName} does not match expected ${identity.version}.`)
        if (metadata.versionCode !== identity.versionCode) failures.push(`APK versionCode ${metadata.versionCode} does not match expected ${identity.versionCode}.`)
      }
    }
  }

  let assetData
  if (usableApk && tools.jar && existsSync(publicDirectory)) {
    const listing = runCommand(tools.jar, ['tf', apkPath])
    if (!toolSucceeded(listing)) {
      failures.push(`Could not inspect release APK contents: ${toolFailure('jar', listing)}`)
    } else {
      const entries = listing.stdout.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)
      const unsafe = entries.find(isUnsafeArchiveEntry)
      if (unsafe) {
        failures.push(`Release APK contains an unsafe archive entry: ${unsafe}.`)
      } else {
        const publicEntries = entries.filter((entry) => entry.startsWith('assets/public/') && !entry.endsWith('/'))
        const duplicates = [...new Set(publicEntries.filter((entry, index) => publicEntries.indexOf(entry) !== index))]
        if (duplicates.length > 0) failures.push(`Release APK contains duplicate public asset entries: ${duplicates.join(', ')}.`)
        const temporaryDirectory = mkdtempSync(join(options.temporaryRoot ?? tmpdir(), 'mysterycases-release-'))
        try {
          const extraction = runCommand(tools.jar, ['xf', apkPath], { cwd: temporaryDirectory })
          if (!toolSucceeded(extraction)) {
            failures.push(`Could not extract release APK contents: ${toolFailure('jar', extraction)}`)
          } else {
            assetData = compareAssets(publicDirectory, join(temporaryDirectory, 'assets', 'public'), failures)
          }
        } finally {
          rmSync(temporaryDirectory, { recursive: true, force: true })
        }
      }
    }
  }

  if (failures.length > 0) throw new AndroidReleaseVerificationError(failures)
  const workerName = assetData.sourceWorkers[0]
  return {
    packageId: identity.packageId,
    version: identity.version,
    versionCode: identity.versionCode,
    apkPath,
    apkSha256: hashFile(apkPath),
    assetCount: assetData.sourceFiles.length,
    workerName,
    workerSha256: hashFile(join(publicDirectory, ...workerName.split('/'))),
  }
}

export const formatReleaseVerification = (result) => [
  `Android release verified: ${result.packageId} v${result.version} (versionCode ${result.versionCode}).`,
  `APK SHA-256: ${result.apkSha256}`,
  `Worker: ${result.workerName}`,
  `Worker SHA-256: ${result.workerSha256}`,
  `Packaged public assets: ${result.assetCount}`,
]

export const syncAndroidReleaseAssets = (options = {}) => {
  const root = resolve(options.root ?? process.cwd())
  const runCommand = options.runCommand ?? runReleaseTool
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const sync = runCommand(npmCommand, ['run', 'android:sync'], { cwd: root })
  if (!toolSucceeded(sync)) {
    throw new Error(`Android asset build/sync failed: ${toolFailure('npm run android:sync', sync)}`)
  }
}

export const prepareAndroidRelease = (options = {}) => {
  const root = resolve(options.root ?? process.cwd())
  const sync = options.sync ?? syncAndroidReleaseAssets
  const verify = options.verify ?? verifyAndroidRelease
  sync({ root, runCommand: options.syncRunCommand ?? runReleaseTool })
  const verification = verify({ root, ...options.verifyOptions })
  const destination = resolve(options.destination ?? join(root, 'release', 'MysteryCases.apk'))
  const destinationDirectory = dirname(destination)
  mkdirSync(destinationDirectory, { recursive: true })
  const stagingDirectory = mkdtempSync(join(destinationDirectory, '.prepare-'))
  const stagingApk = join(stagingDirectory, basename(destination))
  try {
    copyFileSync(verification.apkPath, stagingApk)
    if (hashFile(stagingApk) !== verification.apkSha256) {
      throw new Error('Prepared APK staging copy is not byte-identical to the verified APK.')
    }
    copyFileSync(stagingApk, destination)
    if (hashFile(destination) !== verification.apkSha256) {
      throw new Error('Prepared APK is not byte-identical to the verified APK.')
    }
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true })
  }
  return { ...verification, destination }
}
