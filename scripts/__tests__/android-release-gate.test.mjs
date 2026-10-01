import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AndroidReleaseVerificationError,
  prepareAndroidRelease,
  syncAndroidReleaseAssets,
  verifyAndroidRelease,
} from '../android-release-gate.mjs'

const workerName = 'assets/proceduralGeneration.worker-current.js'
const defaultAssets = {
  'index.html': '<main>MysteryCases</main>',
  'assets/main.js': 'console.log("main")',
  [workerName]: 'self.onmessage = () => {}',
}

const write = (filePath, contents) => {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, contents)
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

describe('Android release gate', () => {
  let root
  let temporaryRoot

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mysterycases-gate-fixture-'))
    temporaryRoot = join(root, 'temporary')
    mkdirSync(temporaryRoot)
    write(join(root, 'package.json'), JSON.stringify({ version: '1.2.0' }))
    write(join(root, 'android/app/build.gradle'), `
android {
  defaultConfig {
    applicationId "com.mysterycases.app"
    versionCode 3
    versionName "1.2.0"
  }
  signingConfigs { release {} }
  buildTypes { release { signingConfig signingConfigs.release } }
}`)
    write(join(root, 'capacitor.config.ts'), "export default { appId: 'com.mysterycases.app' }")
    write(join(root, '.gitignore'), '*.jks\n*.keystore\nandroid/keystore.properties\nandroid/keystore/\nrelease/\n')
    for (const [file, contents] of Object.entries(defaultAssets)) {
      write(join(root, 'android/app/src/main/assets/public', ...file.split('/')), contents)
    }
    write(join(root, 'android/app/build/outputs/apk/release/app-release.apk'), 'fixture apk')
  })

  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const createHarness = ({
    packagedAssets = defaultAssets,
    packageId = 'com.mysterycases.app',
    versionName = '1.2.0',
    versionCode = 3,
    signatureStatus = 0,
    extractionStatus = 0,
    tools = { apksigner: 'apksigner', aapt: 'aapt2', jar: 'jar' },
  } = {}) => {
    const runCommand = vi.fn((command, args, options = {}) => {
      if (command === tools.apksigner) return { status: signatureStatus, stdout: '', stderr: '' }
      if (command === tools.aapt) {
        return {
          status: 0,
          stdout: `package: name='${packageId}' versionCode='${versionCode}' versionName='${versionName}'\n`,
          stderr: '',
        }
      }
      if (command === tools.jar && args[0] === 'tf') {
        return {
          status: 0,
          stdout: Object.keys(packagedAssets).map((file) => `assets/public/${file}`).join('\n'),
          stderr: '',
        }
      }
      if (command === tools.jar && args[0] === 'xf') {
        if (extractionStatus !== 0) return { status: extractionStatus, stdout: '', stderr: '' }
        for (const [file, contents] of Object.entries(packagedAssets)) {
          write(join(options.cwd, 'assets/public', ...file.split('/')), contents)
        }
        return { status: 0, stdout: '', stderr: '' }
      }
      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
    })
    return { runCommand, tools }
  }

  const verify = (settings = {}) => {
    const harness = createHarness(settings)
    return verifyAndroidRelease({
      root,
      temporaryRoot,
      isTracked: () => false,
      ...harness,
    })
  }

  const captureFailure = (settings = {}) => {
    try {
      verify(settings)
      throw new Error('Expected release verification to fail.')
    } catch (error) {
      expect(error).toBeInstanceOf(AndroidReleaseVerificationError)
      expect(readdirSync(temporaryRoot)).toEqual([])
      return error.failures
    }
  }

  it('accepts a signed APK whose identity and complete public asset tree match', () => {
    const result = verify()
    expect(result).toMatchObject({
      packageId: 'com.mysterycases.app',
      version: '1.2.0',
      versionCode: 3,
      assetCount: 3,
      workerName,
      workerSha256: sha256(defaultAssets[workerName]),
    })
    expect(readdirSync(temporaryRoot)).toEqual([])
  })

  it('rejects an APK without a procedural Worker', () => {
    const packagedAssets = { ...defaultAssets }
    delete packagedAssets[workerName]
    expect(captureFailure({ packagedAssets }).join('\n')).toContain(
      'Release APK must contain exactly one procedural Worker chunk; found 0.',
    )
  })

  it('rejects different Worker bytes even when the filename matches', () => {
    const failures = captureFailure({
      packagedAssets: { ...defaultAssets, [workerName]: 'different worker' },
    }).join('\n')
    expect(failures).toContain(`APK assets differ in 1 file(s): ${workerName}.`)
    expect(failures).toContain(`Release APK procedural Worker bytes differ for ${workerName}.`)
  })

  it('rejects a stale Worker filename', () => {
    const packagedAssets = { ...defaultAssets }
    delete packagedAssets[workerName]
    packagedAssets['assets/proceduralGeneration.worker-old.js'] = defaultAssets[workerName]
    expect(captureFailure({ packagedAssets }).join('\n')).toContain(
      `Release APK contains stale procedural Worker chunk assets/proceduralGeneration.worker-old.js; expected ${workerName}.`,
    )
  })

  it('rejects a missing public asset', () => {
    const packagedAssets = { ...defaultAssets }
    delete packagedAssets['assets/main.js']
    expect(captureFailure({ packagedAssets }).join('\n')).toContain(
      'APK assets are missing 1 file(s): assets/main.js.',
    )
  })

  it('rejects an extra public asset', () => {
    const packagedAssets = { ...defaultAssets, 'assets/stale.js': 'stale' }
    expect(captureFailure({ packagedAssets }).join('\n')).toContain(
      'APK assets contain 1 unexpected file(s): assets/stale.js.',
    )
  })

  it.each([
    [{ versionName: '1.1.0' }, 'APK versionName 1.1.0 does not match expected 1.2.0.'],
    [{ versionCode: 2 }, 'APK versionCode 2 does not match expected 3.'],
  ])('rejects wrong APK identity %#', (settings, message) => {
    expect(captureFailure(settings)).toContain(message)
  })

  it('rejects a missing release APK', () => {
    rmSync(join(root, 'android/app/build/outputs/apk/release/app-release.apk'))
    expect(captureFailure()).toContain('Release APK is missing.')
  })

  it('rejects an empty release APK', () => {
    writeFileSync(join(root, 'android/app/build/outputs/apk/release/app-release.apk'), '')
    expect(captureFailure()).toContain('Release APK is empty.')
  })

  it('rejects a missing apksigner', () => {
    const failures = captureFailure({ tools: { aapt: 'aapt2', jar: 'jar' } })
    expect(failures).toContain('apksigner is required but was not found.')
  })

  it('rejects an APK when signature verification fails', () => {
    expect(captureFailure({ signatureStatus: 1 }).join('\n')).toContain(
      'Release APK signature verification failed: apksigner exited with status 1.',
    )
  })

  it('removes its temporary directory when APK extraction fails', () => {
    expect(captureFailure({ extractionStatus: 7 }).join('\n')).toContain(
      'Could not extract release APK contents: jar exited with status 7.',
    )
  })

  it('does not copy anything when strict verification rejects the APK', () => {
    const destination = join(root, 'release', 'MysteryCases.apk')
    write(destination, 'existing artifact')
    const rejection = new AndroidReleaseVerificationError(['rejected fixture'])
    expect(() => prepareAndroidRelease({
      root,
      destination,
      sync: () => {},
      verify: () => { throw rejection },
    })).toThrow(rejection)
    expect(readFileSync(destination, 'utf8')).toBe('existing artifact')
  })

  it('prepares only a byte-identical copy of a verified APK', () => {
    const source = join(root, 'android/app/build/outputs/apk/release/app-release.apk')
    const destination = join(root, 'release', 'MysteryCases.apk')
    const apkSha256 = sha256(readFileSync(source))
    const result = prepareAndroidRelease({
      root,
      destination,
      sync: () => {},
      verify: () => ({
        apkPath: source,
        apkSha256,
        packageId: 'com.mysterycases.app',
        version: '1.2.0',
        versionCode: 3,
        workerName,
        workerSha256: sha256(defaultAssets[workerName]),
        assetCount: 3,
      }),
    })
    expect(result.destination).toBe(destination)
    expect(readFileSync(destination)).toEqual(readFileSync(source))
    expect(readdirSync(dirname(destination)).filter((name) => name.startsWith('.prepare-'))).toEqual([])
  })

  it('syncs current HEAD assets before rejecting an APK that matched stale synced assets', () => {
    const oldWorkerName = 'assets/proceduralGeneration.worker-old.js'
    const oldAssets = {
      'index.html': '<main>old build</main>',
      'assets/main-old.js': 'console.log("old")',
      [oldWorkerName]: 'self.onmessage = () => "old"',
    }
    const publicDirectory = join(root, 'android/app/src/main/assets/public')
    rmSync(publicDirectory, { recursive: true, force: true })
    for (const [file, contents] of Object.entries(oldAssets)) {
      write(join(publicDirectory, ...file.split('/')), contents)
    }

    const harness = createHarness({ packagedAssets: oldAssets })
    const verifyStaleApk = vi.fn(() => verifyAndroidRelease({
      root,
      temporaryRoot,
      isTracked: () => false,
      ...harness,
    }))
    expect(verifyStaleApk()).toMatchObject({ workerName: oldWorkerName, version: '1.2.0' })

    const destination = join(root, 'release', 'MysteryCases.apk')
    write(destination, 'existing destination')
    const sync = vi.fn(() => {
      rmSync(publicDirectory, { recursive: true, force: true })
      for (const [file, contents] of Object.entries(defaultAssets)) {
        write(join(publicDirectory, ...file.split('/')), contents)
      }
    })

    expect(() => prepareAndroidRelease({
      root,
      destination,
      sync,
      verify: verifyStaleApk,
    })).toThrow(AndroidReleaseVerificationError)
    expect(sync).toHaveBeenCalledOnce()
    expect(verifyStaleApk).toHaveBeenCalledTimes(2)
    expect(readFileSync(destination, 'utf8')).toBe('existing destination')
    expect(readdirSync(temporaryRoot)).toEqual([])
  })

  it('does not verify or copy when the Android build/sync command fails', () => {
    const destination = join(root, 'release', 'MysteryCases.apk')
    write(destination, 'existing destination')
    const verify = vi.fn()
    const syncRunCommand = vi.fn(() => ({ status: 1, stdout: '', stderr: '' }))

    expect(() => prepareAndroidRelease({
      root,
      destination,
      sync: syncAndroidReleaseAssets,
      syncRunCommand,
      verify,
    })).toThrow('Android asset build/sync failed: npm run android:sync exited with status 1.')
    expect(syncRunCommand).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'android:sync'],
      { cwd: root },
    )
    expect(verify).not.toHaveBeenCalled()
    expect(readFileSync(destination, 'utf8')).toBe('existing destination')
  })
})
