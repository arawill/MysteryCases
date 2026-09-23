import serializedCase003 from './json/case003.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case003 = loadSerializedCase(serializedCase003)
