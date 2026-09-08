import { getDifficultyPreset } from '../difficultyPresets'
import { createSeededRandom, shuffle } from '../generation/random'
import type { GenerationCharacter } from '../generation/types'
import type { DifficultyRating } from '../types'
import { characterCatalog } from './catalog'
export function selectCharactersForDifficulty(difficulty: DifficultyRating, seed: number): GenerationCharacter[] { const count = getDifficultyPreset(difficulty).characterCount; const roster = shuffle(characterCatalog, createSeededRandom(seed)).slice(0, count); const victimIndex = Math.floor(createSeededRandom((seed + 1) >>> 0)() * roster.length); return roster.map((character, index) => ({ ...character, isVictim: index === victimIndex })) }
