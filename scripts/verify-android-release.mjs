import {
  AndroidReleaseVerificationError,
  formatReleaseVerification,
  verifyAndroidRelease,
} from './android-release-gate.mjs'

try {
  const result = verifyAndroidRelease()
  for (const line of formatReleaseVerification(result)) console.log(line)
} catch (error) {
  console.error('Android release verification failed:')
  if (error instanceof AndroidReleaseVerificationError) {
    for (const failure of error.failures) console.error(`- ${failure}`)
  } else {
    console.error(`- ${error instanceof Error ? error.message : String(error)}`)
  }
  process.exitCode = 1
}
