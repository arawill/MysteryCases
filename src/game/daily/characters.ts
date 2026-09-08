import { createSeededRandom, shuffle } from '../generation/random'
import type { GenerationCharacter } from '../generation/types'
import { getDailySeed } from './date'
export interface DailyCharacterDefinition { id: string; name: string; avatar: string }
export const dailyCharacterCatalog: readonly DailyCharacterDefinition[] = [
  { id: 'ada', name: 'Ada', avatar: '🦋' }, { id: 'biel', name: 'Biel', avatar: '🦔' }, { id: 'cora', name: 'Cora', avatar: '🐦' }, { id: 'dario', name: 'Darío', avatar: '🦝' }, { id: 'elena', name: 'Elena', avatar: '🦢' }, { id: 'fabio', name: 'Fabio', avatar: '🦊' }, { id: 'gema', name: 'Gema', avatar: '🐚' }, { id: 'hugo', name: 'Hugo', avatar: '🦉' }, { id: 'iris', name: 'Iris', avatar: '🐈' }, { id: 'jules', name: 'Jules', avatar: '🦦' }, { id: 'kai', name: 'Kai', avatar: '🦎' }, { id: 'lara', name: 'Lara', avatar: '🐝' }, { id: 'milo', name: 'Milo', avatar: '🐺' }, { id: 'nerea', name: 'Nerea', avatar: '🪶' }, { id: 'olmo', name: 'Olmo', avatar: '🐢' }, { id: 'petra', name: 'Petra', avatar: '🦜' }, { id: 'quim', name: 'Quim', avatar: '🐙' }, { id: 'runa', name: 'Runa', avatar: '🦌' }
]
export const dailyCharacterGroupA = dailyCharacterCatalog.slice(0, 9)
export const dailyCharacterGroupB = dailyCharacterCatalog.slice(9)
const dayIndex = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
export function selectDailyCharactersForDate(date: Date): GenerationCharacter[] { const seed = getDailySeed(date), evenDay = dayIndex(date) % 2 === 0, countA = evenDay ? 4 : 2, countB = evenDay ? 2 : 4; const roster = shuffle([...shuffle(dailyCharacterGroupA, createSeededRandom(seed)).slice(0, countA), ...shuffle(dailyCharacterGroupB, createSeededRandom((seed + 1) >>> 0)).slice(0, countB)], createSeededRandom((seed + 2) >>> 0)); const victimIndex = Math.floor(createSeededRandom((seed + 3) >>> 0)() * roster.length); return roster.map((character, index) => ({ ...character, isVictim: index === victimIndex })) }
