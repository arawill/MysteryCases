import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js'
import caseSchema from './schema/case.schema.json'
import type { SerializedGameCase } from './serializedTypes'

// Types are composed through $ref/allOf; Ajv cannot infer those for strictTypes,
// although the resulting Draft 2020-12 schema is type-safe at validation time.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false })
const validate = ajv.compile<SerializedGameCase>(caseSchema)

function describeError(error: ErrorObject): string {
  const path = error.instancePath || '$'
  if (error.keyword === 'required') return `${path} requiere la propiedad ${String(error.params.missingProperty)}.`
  return `${path} ${error.message ?? `incumple ${error.keyword}`}.`
}

export function validateSerializedCaseSchema(value: unknown): boolean {
  return validate(value)
}

export function assertSerializedCaseSchema(value: unknown): asserts value is SerializedGameCase {
  if (validate(value)) return
  const details = (validate.errors ?? []).slice(0, 5).map(describeError).join(' ')
  throw new Error(`Caso serializado inválido según JSON Schema: ${details}`)
}
