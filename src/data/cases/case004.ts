import serializedCase004 from './json/case004.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

/** Compatibility export: consumers still receive the same runtime GameCase API. */
export const case004 = loadSerializedCase(serializedCase004)
