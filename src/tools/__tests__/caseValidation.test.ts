import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import serializedCase001 from '../../data/cases/json/case001.json'
import { manualNormalCases } from '../../data/cases/manualNormalCases'
import { createCaseDraft } from '../caseAuthoring/drafts'
import { expectedSerializedNormalCaseIds, registeredSerializedNormalCases } from '../caseAuthoring/publishedCases'
import { formatCaseValidationIssue, validateCaseFile, validatePublishedCases } from '../caseAuthoring/validation'

const roots: string[] = []
const temporaryRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'mystery-cases-validation-'))
  roots.push(root)
  return root
}
const productionDirectory = (root: string) => join(root, 'src', 'data', 'cases', 'json')
const writeCase = (root: string, filename: string, value: unknown) => {
  const directory = productionDirectory(root)
  mkdirSync(directory, { recursive: true })
  const filePath = join(directory, filename)
  writeFileSync(filePath, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return filePath
}
const clone = () => structuredClone(serializedCase001) as Record<string, unknown>

afterEach(() => {
  for (const root of roots.splice(0)) {
    const resolved = resolve(root)
    if (dirname(resolved) !== resolve(tmpdir()) || !basename(resolved).startsWith('mystery-cases-validation-')) throw new Error(`Ruta temporal inesperada: ${resolved}`)
    rmSync(resolved, { recursive: true, force: true })
  }
})

describe('validación individual de JSON de casos', () => {
  it('rechaza JSON mal formado con ubicación y fragmento', () => {
    const root = temporaryRoot()
    const result = validateCaseFile(writeCase(root, 'case099.json', '{\n  "id": "case099",\n}'), { projectRoot: root })
    expect(result.ok).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'malformed_json', path: expect.stringContaining('line') })]))
  })

  it('rechaza schemaVersion incompatible', () => {
    const root = temporaryRoot(), value = clone()
    value.id = 'case099'; value.schemaVersion = 2
    const result = validateCaseFile(writeCase(root, 'case099.json', value), { projectRoot: root })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'schema_version', path: '/schemaVersion', value: 2 })]))
  })

  it('explica un incumplimiento del schema con ruta y valor', () => {
    const root = temporaryRoot(), value = clone()
    value.id = 'case099'; value.rows = '6'
    const result = validateCaseFile(writeCase(root, 'case099.json', value), { projectRoot: root })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'schema', path: '/rows', value: '6' })]))
  })

  it('propaga un error semántico del loader', () => {
    const root = temporaryRoot(), value = clone()
    value.id = 'case099'
    const board = value.board as Array<Record<string, unknown>>
    board[0]!.zoneId = 'missing-zone'
    const result = validateCaseFile(writeCase(root, 'case099.json', value), { projectRoot: root })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'semantic', reason: expect.stringContaining('zona referenciada inexistente') })]))
  })

  it('señala la ruta exacta de un asset inexistente', () => {
    const root = temporaryRoot(), value = clone()
    value.id = 'case099'
    const objects = value.objects as Array<Record<string, unknown>>
    objects[0]!.iconAsset = 'missing.asset'
    const result = validateCaseFile(writeCase(root, 'case099.json', value), { projectRoot: root })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'asset', path: '/objects/0/iconAsset', value: 'missing.asset' })]))
  })

  it('rechaza colisión de ID y discrepancia entre nombre e identificador', () => {
    const root = temporaryRoot()
    writeCase(root, 'case001.json', serializedCase001)
    const drafts = join(root, 'drafts', 'cases')
    mkdirSync(drafts, { recursive: true })
    const candidate = join(drafts, 'case099.json')
    writeFileSync(candidate, `${JSON.stringify(serializedCase001)}\n`, 'utf8')
    const result = validateCaseFile(candidate, { projectRoot: root, registeredCaseIds: ['case001'] })
    expect(result.issues.map(validationIssue => validationIssue.code)).toEqual(expect.arrayContaining(['id_collision', 'filename_mismatch']))
  })

  it('acepta un caso válido y lo convierte en GameCase', () => {
    const root = temporaryRoot()
    const filePath = writeCase(root, 'case001.json', serializedCase001)
    const result = validateCaseFile(filePath, { projectRoot: root, registeredCaseIds: ['case001'] })
    expect(result).toMatchObject({ ok: true, caseId: 'case001', caseData: { id: 'case001' }, issues: [] })
  })

  it('rechaza rutas fuera del proyecto', () => {
    const root = temporaryRoot()
    const result = validateCaseFile(join(root, '..', 'outside.json'), { projectRoot: root })
    expect(result.issues).toEqual([expect.objectContaining({ code: 'unsafe_path' })])
  })

  it('mantiene los borradores fuera del runtime', () => {
    const root = temporaryRoot()
    const created = createCaseDraft('case099', { projectRoot: root })
    const validation = validateCaseFile(created.filePath, { projectRoot: root })
    expect([...manualNormalCases.values()].some(caseData => caseData.id === 'case099')).toBe(false)
    expect(readFileSync(join(root, 'drafts', 'cases', 'case099.json'), 'utf8')).toContain('__TODO_INCOMPLETE__')
    expect(validation.issues.map(validationIssue => validationIssue.code)).toEqual(expect.arrayContaining(['draft_metadata', 'draft_marker', 'schema']))
  })
})

describe('validación global de casos publicados', () => {
  it('valida correctamente los quince JSON y registros actuales', () => {
    const result = validatePublishedCases({
      projectRoot: process.cwd(),
      registeredCases: registeredSerializedNormalCases,
      expectedCaseIds: expectedSerializedNormalCaseIds,
    })
    expect(result).toMatchObject({ ok: true, filesChecked: 15, registeredCasesChecked: 15, issues: [] })
  })

  it('detecta ID duplicado, archivo no registrado y registro sin archivo', () => {
    const root = temporaryRoot()
    const first = clone(); first.id = 'case001'
    const duplicate = clone(); duplicate.id = 'case001'
    writeCase(root, 'case001.json', first)
    writeCase(root, 'case099.json', duplicate)
    const result = validatePublishedCases({
      projectRoot: root,
      registeredCases: [
        { difficulty: 1, caseNumber: 1, caseData: registeredSerializedNormalCases[0]!.caseData },
        { difficulty: 1, caseNumber: 2, caseData: { ...registeredSerializedNormalCases[0]!.caseData, id: 'case002' } },
      ],
      expectedCaseIds: ['case001', 'case002'],
    })
    expect(result.issues.map(validationIssue => validationIssue.code)).toEqual(expect.arrayContaining(['duplicate_id', 'registered_without_file', 'expected_file_missing']))
    expect(formatCaseValidationIssue(result.issues[0]!)).toContain('valor')
  })

  it('detecta un JSON válido que aún no está registrado', () => {
    const root = temporaryRoot(), value = clone()
    value.id = 'case099'
    writeCase(root, 'case099.json', value)
    const result = validatePublishedCases({ projectRoot: root, registeredCases: [], expectedCaseIds: [] })
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unregistered_file', value: 'case099' })]))
  })
})
