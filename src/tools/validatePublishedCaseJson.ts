import { expectedSerializedNormalCaseIds, registeredSerializedNormalCases } from './caseAuthoring/publishedCases'
import { formatCaseValidationIssue, validatePublishedCases } from './caseAuthoring/validation'

const result = validatePublishedCases({
  projectRoot: process.cwd(),
  registeredCases: registeredSerializedNormalCases,
  expectedCaseIds: expectedSerializedNormalCaseIds,
})

if (result.ok) console.log(`${result.filesChecked} JSON de casos normales publicados y ${result.registeredCasesChecked} entradas de runtime validados.`)
else {
  console.error('La validación global de casos publicados ha fallado:')
  result.issues.forEach(validationIssue => console.error(`- ${formatCaseValidationIssue(validationIssue)}`))
  process.exitCode = 1
}
