import serializedCase005 from './json/case005.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case005 = loadSerializedCase(serializedCase005)
