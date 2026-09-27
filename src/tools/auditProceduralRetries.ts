import { formatRetryAuditSummary, parseRetryAuditArgs, retryAuditExitCode, runProceduralRetryAudit, writeRetryAuditOutput } from './proceduralRetryAudit'

try {
  const moduleIndex = process.argv.findIndex(argument => argument.replaceAll('\\', '/').endsWith('/src/tools/auditProceduralRetries.ts'))
  const options = parseRetryAuditArgs(process.argv.slice(moduleIndex >= 0 ? moduleIndex + 1 : 2)), report = runProceduralRetryAudit(options)
  const content = options.json ? JSON.stringify(report, null, 2) : formatRetryAuditSummary(report)
  console.log(content)
  if (options.output) console.log(`Written: ${writeRetryAuditOutput(process.cwd(), options.output, `${content}\n`, options.overwrite)}`)
  process.exitCode = retryAuditExitCode(report)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2
}
