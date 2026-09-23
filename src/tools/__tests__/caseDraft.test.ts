import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCaseDraft, normalizeCaseIdentifier } from '../caseAuthoring/drafts'

const roots: string[] = []
const temporaryRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'mystery-cases-authoring-'))
  roots.push(root)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    const resolved = resolve(root)
    if (dirname(resolved) !== resolve(tmpdir()) || !basename(resolved).startsWith('mystery-cases-authoring-')) throw new Error(`Ruta temporal inesperada: ${resolved}`)
    rmSync(resolved, { recursive: true, force: true })
  }
})

describe('creación de borradores de casos', () => {
  it('normaliza un número y crea fuera de producción un JSON incompleto inequívoco', () => {
    const root = temporaryRoot()
    const created = createCaseDraft('99', { projectRoot: root })
    const value = JSON.parse(readFileSync(created.filePath, 'utf8')) as Record<string, unknown>

    expect(created.caseId).toBe('case099')
    expect(created.filePath).toBe(join(root, 'drafts', 'cases', 'case099.json'))
    expect(value).toMatchObject({ id: 'case099', schemaVersion: 1, title: '__TODO_TITLE__', rows: 0 })
    expect(value).toHaveProperty('__draft.status', '__TODO_INCOMPLETE__')
    expect(existsSync(join(root, 'src', 'data', 'cases', 'json', 'case099.json'))).toBe(false)
    expect(created.nextStep).toContain('npm run case:validate')
  })

  it('rechaza un ID ya publicado aunque el archivo existente esté incompleto', () => {
    const root = temporaryRoot()
    const production = join(root, 'src', 'data', 'cases', 'json')
    mkdirSync(production, { recursive: true })
    writeFileSync(join(production, 'case001.json'), '{"id":"case001"}\n', 'utf8')
    expect(() => createCaseDraft('case001', { projectRoot: root })).toThrow('ya existe')
  })

  it.each(['../case099', '..\\case099', 'case099.json', '/case099', 'case000', '0', '1000', 'CASE099'])('rechaza el identificador peligroso o inválido %s', input => {
    expect(() => normalizeCaseIdentifier(input)).toThrow('Identificador de caso inválido')
  })

  it('nunca sobrescribe un borrador existente', () => {
    const root = temporaryRoot()
    const created = createCaseDraft('case099', { projectRoot: root })
    const before = readFileSync(created.filePath, 'utf8')

    expect(() => createCaseDraft('case099', { projectRoot: root })).toThrow('ya existe')
    expect(readFileSync(created.filePath, 'utf8')).toBe(before)
  })

  it('rechaza un directorio de borradores que salga del proyecto autorizado', () => {
    const root = temporaryRoot()
    expect(() => createCaseDraft('case099', { projectRoot: root, draftsDirectory: tmpdir() })).toThrow('fuera del proyecto autorizado')
  })
})
