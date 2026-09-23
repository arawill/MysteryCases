import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { resolveCaseAsset } from '../../game/cases/caseAssetRegistry'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'
import { CURRENT_CASE_SCHEMA_VERSION } from '../../game/cases/schemaVersion'
import type { SerializedGameCase } from '../../game/cases/serializedTypes'
import { getSerializedCaseSchemaIssues } from '../../game/cases/validateSerializedCaseSchema'
import type { GameCase } from '../../game/types'
import { assertPathInsideProject, isCaseIdentifier } from './drafts'

export interface CaseValidationIssue {
  code: string
  file: string
  path: string
  value?: unknown
  reason: string
}

export interface CaseFileValidationResult {
  ok: boolean
  filePath: string
  caseId?: string
  caseData?: GameCase
  issues: CaseValidationIssue[]
}

export interface ValidateCaseFileOptions {
  projectRoot: string
  productionDirectory?: string
  registeredCaseIds?: readonly string[]
}

export interface RegisteredSerializedCase {
  difficulty: number
  caseNumber: number
  caseData: GameCase
}

export interface ValidatePublishedCasesOptions extends ValidateCaseFileOptions {
  registeredCases: readonly RegisteredSerializedCase[]
  expectedCaseIds: readonly string[]
}

export interface PublishedCasesValidationResult {
  ok: boolean
  filesChecked: number
  registeredCasesChecked: number
  issues: CaseValidationIssue[]
}

const displayPath = (root: string, path: string) => relative(root, path).replaceAll('\\', '/') || '.'
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const issue = (file: string, code: string, path: string, value: unknown, reason: string): CaseValidationIssue => ({ file, code, path, value, reason })

function productionDirectory(options: ValidateCaseFileOptions): string {
  const root = resolve(options.projectRoot)
  return assertPathInsideProject(root, options.productionDirectory ?? join(root, 'src', 'data', 'cases', 'json'), 'El directorio de casos publicados')
}

function safeInputPath(input: string, projectRoot: string): string {
  const root = resolve(projectRoot)
  const candidate = assertPathInsideProject(root, isAbsolute(input) ? input : join(root, input), 'La ruta JSON')
  if (!existsSync(candidate)) return candidate
  return assertPathInsideProject(root, realpathSync(candidate), 'La ruta JSON resuelta')
}

function parseErrorLocation(contents: string, error: unknown): { path: string; reason: string } {
  const reason = error instanceof Error ? error.message : String(error)
  const position = /position (\d+)/.exec(reason)?.[1]
  if (position === undefined) return { path: '$', reason }
  const offset = Number(position)
  const before = contents.slice(0, offset)
  const line = before.split('\n').length
  const lastBreak = before.lastIndexOf('\n')
  return { path: `line ${line}, column ${offset - lastBreak}`, reason }
}

function todoIssues(value: unknown, file: string, path = '$'): CaseValidationIssue[] {
  if (typeof value === 'string') return value.includes('__TODO_') ? [issue(file, 'draft_marker', path, value, 'el marcador de borrador debe sustituirse antes de publicar')] : []
  if (Array.isArray(value)) return value.flatMap((item, index) => todoIssues(item, file, `${path}/${index}`))
  if (!isRecord(value)) return []
  return Object.entries(value).flatMap(([key, item]) => {
    const itemPath = `${path}/${key}`
    const ownIssue = key === '__draft' ? [issue(file, 'draft_metadata', itemPath, item, 'elimina los metadatos __draft antes de publicar')] : []
    return [...ownIssue, ...todoIssues(item, file, itemPath)]
  })
}

function publishedJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => join(directory, entry.name))
    .sort()
}

function publishedIdentities(directory: string): Array<{ filePath: string; id?: string }> {
  return publishedJsonFiles(directory).map(filePath => {
    try {
      const value: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
      return { filePath, ...(isRecord(value) && typeof value.id === 'string' ? { id: value.id } : {}) }
    } catch {
      return { filePath }
    }
  })
}

function assetIssues(value: SerializedGameCase, file: string): CaseValidationIssue[] {
  const references = [
    ...value.zones.flatMap((zone, index) => zone.iconAsset === undefined ? [] : [{ path: `/zones/${index}/iconAsset`, key: zone.iconAsset }]),
    ...value.objects.map((object, index) => ({ path: `/objects/${index}/iconAsset`, key: object.iconAsset })),
    ...value.characters.flatMap((character, index) => character.avatarAsset === undefined ? [] : [{ path: `/characters/${index}/avatarAsset`, key: character.avatarAsset }]),
  ]
  return references.flatMap(reference => {
    try {
      resolveCaseAsset(reference.key)
      return []
    } catch (error) {
      return [issue(file, 'asset', reference.path, reference.key, error instanceof Error ? error.message : String(error))]
    }
  })
}

export function validateCaseFile(inputPath: string, options: ValidateCaseFileOptions): CaseFileValidationResult {
  const root = resolve(options.projectRoot)
  let filePath: string
  try {
    filePath = safeInputPath(inputPath, root)
  } catch (error) {
    return { ok: false, filePath: inputPath, issues: [issue(inputPath, 'unsafe_path', '$', inputPath, error instanceof Error ? error.message : String(error))] }
  }
  const file = displayPath(root, filePath)
  const issues: CaseValidationIssue[] = []
  if (!existsSync(filePath)) return { ok: false, filePath, issues: [issue(file, 'missing_file', '$', filePath, 'el archivo no existe')] }
  if (!statSync(filePath).isFile()) return { ok: false, filePath, issues: [issue(file, 'not_file', '$', filePath, 'la ruta no es un archivo')] }
  if (extname(filePath) !== '.json') issues.push(issue(file, 'file_extension', '$', extname(filePath), 'el archivo debe usar la extensión .json'))

  let contents: string
  try {
    contents = readFileSync(filePath, 'utf8')
  } catch (error) {
    return { ok: false, filePath, issues: [issue(file, 'unreadable_file', '$', filePath, error instanceof Error ? error.message : String(error))] }
  }

  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch (error) {
    const location = parseErrorLocation(contents, error)
    return { ok: false, filePath, issues: [...issues, issue(file, 'malformed_json', location.path, contents.slice(0, 120), location.reason)] }
  }

  issues.push(...todoIssues(value, file))
  const rawId = isRecord(value) ? value.id : undefined
  const caseId = typeof rawId === 'string' ? rawId : undefined
  if (caseId === undefined || !isCaseIdentifier(caseId)) {
    issues.push(issue(file, 'case_id', '/id', rawId, 'el id debe usar el formato caseNNN, entre case001 y case999'))
  } else {
    const expectedFilename = `${caseId}.json`
    if (basename(filePath) !== expectedFilename) issues.push(issue(file, 'filename_mismatch', '/id', caseId, `el archivo debe llamarse ${expectedFilename}`))
  }

  if (isRecord(value) && value.schemaVersion !== CURRENT_CASE_SCHEMA_VERSION) {
    issues.push(issue(file, 'schema_version', '/schemaVersion', value.schemaVersion, `la versión compatible es ${CURRENT_CASE_SCHEMA_VERSION}`))
  }

  const schemaIssues = getSerializedCaseSchemaIssues(value)
  issues.push(...schemaIssues
    .filter(schemaIssue => !(schemaIssue.path === '/schemaVersion' && issues.some(candidate => candidate.code === 'schema_version')))
    .map(schemaIssue => issue(file, 'schema', schemaIssue.path, schemaIssue.value, schemaIssue.reason)))

  const production = productionDirectory(options)
  const candidateIsPublished = dirname(filePath) === production
  if (caseId) {
    for (const existing of publishedIdentities(production)) {
      if (resolve(existing.filePath) !== resolve(filePath) && existing.id === caseId) issues.push(issue(file, 'id_collision', '/id', caseId, `el mismo id ya existe en ${displayPath(root, existing.filePath)}`))
    }
    if (!candidateIsPublished && options.registeredCaseIds?.includes(caseId)) issues.push(issue(file, 'id_collision', '/id', caseId, 'el id ya está registrado en el runtime'))
  }

  let caseData: GameCase | undefined
  if (schemaIssues.length === 0) {
    issues.push(...assetIssues(value as SerializedGameCase, file))
    if (!issues.some(candidate => candidate.code === 'asset')) {
      try {
        caseData = loadSerializedCase(value)
      } catch (error) {
        issues.push(issue(file, 'semantic', '$', caseId, error instanceof Error ? error.message : String(error)))
      }
    }
  }

  return { ok: issues.length === 0, filePath, ...(caseId ? { caseId } : {}), ...(caseData ? { caseData } : {}), issues }
}

export function validatePublishedCases(options: ValidatePublishedCasesOptions): PublishedCasesValidationResult {
  const root = resolve(options.projectRoot)
  let production: string
  try {
    production = productionDirectory(options)
  } catch (error) {
    return { ok: false, filesChecked: 0, registeredCasesChecked: options.registeredCases.length, issues: [issue('.', 'unsafe_path', '$', options.productionDirectory, error instanceof Error ? error.message : String(error))] }
  }
  if (!existsSync(production)) return { ok: false, filesChecked: 0, registeredCasesChecked: options.registeredCases.length, issues: [issue(displayPath(root, production), 'missing_directory', '$', production, 'el directorio de casos publicados no existe')] }

  const files = publishedJsonFiles(production)
  const registeredIds = options.registeredCases.map(entry => entry.caseData.id)
  const results = files.map(filePath => validateCaseFile(filePath, { ...options, productionDirectory: production, registeredCaseIds: registeredIds }))
  const issues = results.flatMap(result => result.issues)
  const fileIds = results.flatMap(result => result.caseId ? [result.caseId] : [])

  const duplicateFileIds = fileIds.filter((id, index) => fileIds.indexOf(id) !== index)
  for (const id of new Set(duplicateFileIds)) issues.push(issue(displayPath(root, production), 'duplicate_id', '/id', id, 'más de un JSON publicado declara este id'))
  const duplicateRegisteredIds = registeredIds.filter((id, index) => registeredIds.indexOf(id) !== index)
  for (const id of new Set(duplicateRegisteredIds)) issues.push(issue('runtime registry', 'duplicate_registration', '/id', id, 'más de una entrada del registro usa este id'))

  for (const registration of options.registeredCases) {
    const expectedId = registration.difficulty === 1 ? `case${String(registration.caseNumber).padStart(3, '0')}` : registration.caseData.id
    if (registration.caseData.id !== expectedId) issues.push(issue('runtime registry', 'registration_mismatch', `${registration.difficulty}:${registration.caseNumber}`, registration.caseData.id, `la entrada debe registrar ${expectedId}`))
    const matching = results.find(result => result.caseId === registration.caseData.id)
    if (!matching) issues.push(issue('runtime registry', 'registered_without_file', `${registration.difficulty}:${registration.caseNumber}`, registration.caseData.id, 'la entrada registrada no tiene un JSON publicado correspondiente'))
    else if (matching.caseData && !isDeepStrictEqual(matching.caseData, registration.caseData)) issues.push(issue(matching.filePath, 'runtime_mismatch', '$', registration.caseData.id, 'el JSON cargado no coincide con el GameCase registrado en runtime'))
  }

  for (const result of results) if (result.caseId && !registeredIds.includes(result.caseId)) issues.push(issue(displayPath(root, result.filePath), 'unregistered_file', '/id', result.caseId, 'el JSON publicado no tiene entrada en el registro de runtime'))
  for (const expectedId of options.expectedCaseIds) {
    if (!fileIds.includes(expectedId)) issues.push(issue(displayPath(root, production), 'expected_file_missing', '$', expectedId, 'falta el JSON exigido por la disponibilidad publicada'))
    if (!registeredIds.includes(expectedId)) issues.push(issue('runtime registry', 'expected_registration_missing', '$', expectedId, 'falta la entrada de runtime exigida por la disponibilidad publicada'))
  }

  return { ok: issues.length === 0, filesChecked: files.length, registeredCasesChecked: options.registeredCases.length, issues }
}

const formatValue = (value: unknown) => {
  if (value === undefined) return '<ausente>'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const formatCaseValidationIssue = (validationIssue: CaseValidationIssue): string =>
  `${validationIssue.file} · ${validationIssue.path} · valor ${formatValue(validationIssue.value)}: ${validationIssue.reason} [${validationIssue.code}]`
