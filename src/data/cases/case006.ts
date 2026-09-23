import serializedCase006 from './json/case006.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case006 = loadSerializedCase(serializedCase006)
