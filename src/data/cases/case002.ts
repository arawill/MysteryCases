import serializedCase002 from './json/case002.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case002 = loadSerializedCase(serializedCase002)
