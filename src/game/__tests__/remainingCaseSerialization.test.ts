import { describe, expect, it } from 'vitest'
import serializedCase003 from '../../data/cases/json/case003.json'
import serializedCase004 from '../../data/cases/json/case004.json'
import serializedCase005 from '../../data/cases/json/case005.json'
import serializedCase006 from '../../data/cases/json/case006.json'
import serializedCase007 from '../../data/cases/json/case007.json'
import serializedCase008 from '../../data/cases/json/case008.json'
import serializedCase009 from '../../data/cases/json/case009.json'
import serializedCase010 from '../../data/cases/json/case010.json'
import serializedCase011 from '../../data/cases/json/case011.json'
import serializedCase012 from '../../data/cases/json/case012.json'
import serializedCase013 from '../../data/cases/json/case013.json'
import serializedCase014 from '../../data/cases/json/case014.json'
import serializedCase015 from '../../data/cases/json/case015.json'
import { loadSerializedCase } from '../cases/loadSerializedCase'
import { validateSerializedCaseSchema } from '../cases/validateSerializedCaseSchema'

describe('remaining normal case serialization', () => {
  it.each([
    ['C03', serializedCase003],
    ['C04', serializedCase004],
    ['C05', serializedCase005],
    ['C06', serializedCase006],
    ['C07', serializedCase007],
    ['C08', serializedCase008],
    ['C09', serializedCase009],
    ['C10', serializedCase010],
    ['C11', serializedCase011],
    ['C12', serializedCase012],
    ['C13', serializedCase013],
    ['C14', serializedCase014],
    ['C15', serializedCase015],
  ])('%s uses schema version 1 and loads through the official contract', (_label, serializedCase) => {
    expect(serializedCase.schemaVersion).toBe(1)
    expect(validateSerializedCaseSchema(serializedCase)).toBe(true)
    expect(loadSerializedCase(serializedCase).id).toBe(serializedCase.id)
  })
})
