import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { CURRENT_CASE_SCHEMA_VERSION } from '../../game/cases/schemaVersion'

const CASE_ID_PATTERN = /^case(\d{3})$/

export const isCaseIdentifier = (value: string): boolean => {
  const match = CASE_ID_PATTERN.exec(value)
  return match !== null && Number(match[1]) >= 1
}

export interface CaseAuthoringPaths {
  projectRoot: string
  productionDirectory?: string
  draftsDirectory?: string
}

export interface CreatedCaseDraft {
  caseId: string
  filePath: string
  nextStep: string
}

export function normalizeCaseIdentifier(input: string): string {
  const trimmed = input.trim()
  const numeric = /^\d{1,3}$/.test(trimmed) ? Number(trimmed) : undefined
  if (numeric !== undefined && numeric >= 1) return `case${String(numeric).padStart(3, '0')}`
  if (isCaseIdentifier(trimmed)) return trimmed
  throw new Error(`Identificador de caso inválido: ${JSON.stringify(input)}. Usa un número entre 1 y 999 o el formato caseNNN.`)
}

export function assertPathInsideProject(projectRoot: string, candidatePath: string, label: string): string {
  const root = resolve(projectRoot)
  const candidate = resolve(candidatePath)
  const physicalRoot = existsSync(root) ? realpathSync(root) : root
  let existingAncestor = candidate
  while (!existsSync(existingAncestor) && dirname(existingAncestor) !== existingAncestor) existingAncestor = dirname(existingAncestor)
  const physicalCandidate = existsSync(existingAncestor)
    ? resolve(realpathSync(existingAncestor), relative(existingAncestor, candidate))
    : candidate
  const pathFromRoot = relative(physicalRoot, physicalCandidate)
  if (pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))) return candidate
  throw new Error(`${label} queda fuera del proyecto autorizado: ${candidate}.`)
}

const directoryPaths = ({ projectRoot, productionDirectory, draftsDirectory }: CaseAuthoringPaths) => {
  const root = resolve(projectRoot)
  return {
    root,
    production: assertPathInsideProject(root, productionDirectory ?? join(root, 'src', 'data', 'cases', 'json'), 'El directorio de casos publicados'),
    drafts: assertPathInsideProject(root, draftsDirectory ?? join(root, 'drafts', 'cases'), 'El directorio de borradores'),
  }
}

function listedCaseIds(directory: string): Set<string> {
  const ids = new Set<string>()
  if (!existsSync(directory)) return ids
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const filenameId = entry.name.slice(0, -'.json'.length)
    if (CASE_ID_PATTERN.test(filenameId)) ids.add(filenameId)
    try {
      const value: unknown = JSON.parse(readFileSync(join(directory, entry.name), 'utf8'))
      if (typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string') ids.add((value as { id: string }).id)
    } catch {
      // A malformed existing file still blocks its filename; its contents are diagnosed by validation.
    }
  }
  return ids
}

const draftTemplate = (caseId: string) => ({
  __draft: {
    status: '__TODO_INCOMPLETE__',
    removeBeforePublishing: true,
    pending: ['title', 'intro', 'rows', 'columns', 'zones', 'objects', 'board', 'characters', 'solution', 'assets', 'clues'],
  },
  schemaVersion: CURRENT_CASE_SCHEMA_VERSION,
  id: caseId,
  title: '__TODO_TITLE__',
  intro: '__TODO_INTRO__',
  difficulty: 1,
  rows: 0,
  columns: 0,
  zones: [],
  objects: [],
  board: [],
  characters: [],
  solution: [],
})

export function createCaseDraft(input: string, paths: CaseAuthoringPaths): CreatedCaseDraft {
  const caseId = normalizeCaseIdentifier(input)
  const directories = directoryPaths(paths)
  const existingIds = new Set([...listedCaseIds(directories.production), ...listedCaseIds(directories.drafts)])
  if (existingIds.has(caseId)) throw new Error(`El caso ${caseId} ya existe como caso publicado o borrador.`)

  mkdirSync(directories.drafts, { recursive: true })
  const filePath = assertPathInsideProject(directories.root, join(directories.drafts, `${caseId}.json`), 'El borrador')
  const contents = `${JSON.stringify(draftTemplate(caseId), null, 2)}\n`
  writeFileSync(filePath, contents, { encoding: 'utf8', flag: 'wx' })

  return {
    caseId,
    filePath,
    nextStep: `Completa ${basename(filePath)}, elimina __draft y todos los marcadores __TODO_…, y ejecuta npm run case:validate -- ${relative(directories.root, filePath)}.`,
  }
}
