import { characterCatalog, type CharacterCatalogEntry } from '../characters/catalog'
import { createSeededRandom, shuffle } from '../generation/random'
import type { GenerationCharacter } from '../generation/types'
import { getDailySeed } from './date'
export type DailyCharacterDefinition = CharacterCatalogEntry
export const dailyCharacterCatalog = characterCatalog
export const dailyCharacterGroupA = dailyCharacterCatalog.slice(0, 9)
export const dailyCharacterGroupB = dailyCharacterCatalog.slice(9)
const dayIndex = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
export function selectDailyCharactersForDate(date: Date): GenerationCharacter[] { const seed = getDailySeed(date), evenDay = dayIndex(date) % 2 === 0, countA = evenDay ? 4 : 2, countB = evenDay ? 2 : 4; const roster = shuffle([...shuffle(dailyCharacterGroupA, createSeededRandom(seed)).slice(0, countA), ...shuffle(dailyCharacterGroupB, createSeededRandom((seed + 1) >>> 0)).slice(0, countB)], createSeededRandom((seed + 2) >>> 0)); const victimIndex = Math.floor(createSeededRandom((seed + 3) >>> 0)() * roster.length); return roster.map((character, index) => ({ ...character, isVictim: index === victimIndex })) }
