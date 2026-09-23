import { formatCaseValidationIssue, validateCaseFile } from './caseAuthoring/validation'
import { registeredSerializedNormalCases } from './caseAuthoring/publishedCases'

const inputPath = process.argv[3]

if (!inputPath) {
  console.error('Uso: npm run case:validate -- <ruta-json>')
  process.exitCode = 1
} else {
  const result = validateCaseFile(inputPath, {
    projectRoot: process.cwd(),
    registeredCaseIds: registeredSerializedNormalCases.map(entry => entry.caseData.id),
  })
  if (result.ok) console.log(`Caso válido: ${result.caseId} (${result.filePath}). Puede prepararse para registro.`)
  else {
    console.error(`Caso no válido: ${result.filePath}`)
    result.issues.forEach(validationIssue => console.error(`- ${formatCaseValidationIssue(validationIssue)}`))
    process.exitCode = 1
  }
}
