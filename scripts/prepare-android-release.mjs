import {
  AndroidReleaseVerificationError,
  formatReleaseVerification,
  prepareAndroidRelease,
} from './android-release-gate.mjs'

try {
  const result = prepareAndroidRelease()
  for (const line of formatReleaseVerification(result)) console.log(line)
  console.log('Prepared release APK: release/MysteryCases.apk')
} catch (error) {
  console.error('Android release preparation failed:')
  if (error instanceof AndroidReleaseVerificationError) {
    for (const failure of error.failures) console.error(`- ${failure}`)
  } else {
    console.error(`- ${error instanceof Error ? error.message : String(error)}`)
  }
  process.exitCode = 1
}
