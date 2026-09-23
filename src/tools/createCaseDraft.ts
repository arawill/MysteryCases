import { createCaseDraft } from './caseAuthoring/drafts'

const input = process.argv[3]

if (!input) {
  console.error('Uso: npm run case:draft -- <número|caseNNN>')
  process.exitCode = 1
} else {
  try {
    const created = createCaseDraft(input, { projectRoot: process.cwd() })
    console.log(`Borrador ${created.caseId} creado fuera del runtime: ${created.filePath}`)
    console.log(created.nextStep)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
