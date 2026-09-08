import { characterCatalog, type CharacterCatalogEntry } from '../characters/catalog'
import { createSeededRandom, shuffle } from '../generation/random'
import type { GenerationCharacter } from '../generation/types'
import { getDailyDifficultySeed } from './date'
import type { DifficultyRating } from '../types'
import { getDifficultyPreset } from '../difficultyPresets'
export type DailyCharacterDefinition = CharacterCatalogEntry
export const dailyCharacterCatalog = characterCatalog
export const dailyCharacterGroupA = dailyCharacterCatalog.slice(0, 9)
export const dailyCharacterGroupB = dailyCharacterCatalog.slice(9)
const dayIndex = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
export function selectDailyCharactersForDate(date: Date, difficulty: DifficultyRating = 1): GenerationCharacter[] { const seed = getDailyDifficultySeed(date, difficulty), count = getDifficultyPreset(difficulty).characterCount, evenDay = dayIndex(date) % 2 === 0, high = Math.floor(count / 2) + 1, low = count - high, countA = evenDay ? high : low, countB = evenDay ? low : high; const roster = shuffle([...shuffle(dailyCharacterGroupA, createSeededRandom(seed)).slice(0, countA), ...shuffle(dailyCharacterGroupB, createSeededRandom((seed + 1) >>> 0)).slice(0, countB)], createSeededRandom((seed + 2) >>> 0)); const victimIndex = Math.floor(createSeededRandom((seed + 3) >>> 0)() * roster.length); return roster.map((character, index) => ({ ...character, isVictim: index === victimIndex })) }
