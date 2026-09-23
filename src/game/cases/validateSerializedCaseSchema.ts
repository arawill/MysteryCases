import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js'
import caseSchema from './schema/case.schema.json'
import type { SerializedGameCase } from './serializedTypes'

// Types are composed through $ref/allOf; Ajv cannot infer those for strictTypes,
// although the resulting Draft 2020-12 schema is type-safe at validation time.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false })
const validate = ajv.compile<SerializedGameCase>(caseSchema)

export interface SerializedCaseSchemaIssue {
  path: string
  value: unknown
  reason: string
}

const escapePointerSegment = (segment: string) => segment.replaceAll('~', '~0').replaceAll('/', '~1')
const unescapePointerSegment = (segment: string) => segment.replaceAll('~1', '/').replaceAll('~0', '~')

function valueAtPointer(value: unknown, pointer: string): unknown {
  if (!pointer) return value
  let current = value
  for (const segment of pointer.slice(1).split('/').map(unescapePointerSegment)) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function toIssue(error: ErrorObject, value: unknown): SerializedCaseSchemaIssue {
  if (error.keyword === 'required') {
    const missingProperty = String(error.params.missingProperty)
    const path = `${error.instancePath}/${escapePointerSegment(missingProperty)}`
    return { path, value: undefined, reason: `requiere la propiedad ${missingProperty}` }
  }
  return {
    path: error.instancePath || '$',
    value: valueAtPointer(value, error.instancePath),
    reason: error.message ?? `incumple ${error.keyword}`,
  }
}

export function getSerializedCaseSchemaIssues(value: unknown): SerializedCaseSchemaIssue[] {
  if (validate(value)) return []
  return (validate.errors ?? []).map(error => toIssue(error, value))
}

export function validateSerializedCaseSchema(value: unknown): boolean {
  return getSerializedCaseSchemaIssues(value).length === 0
}

export function assertSerializedCaseSchema(value: unknown): asserts value is SerializedGameCase {
  const issues = getSerializedCaseSchemaIssues(value)
  if (issues.length === 0) return
  const details = issues.slice(0, 5).map(issue => `${issue.path} ${issue.reason}.`).join(' ')
  throw new Error(`Caso serializado inválido según JSON Schema: ${details}`)
}
