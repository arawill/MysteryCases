import serializedCase001 from './json/case001.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case001 = loadSerializedCase(serializedCase001)
