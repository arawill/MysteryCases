import type { GameCase } from '../../types'
import type { ScenarioProfile } from './types'
export function createScenarioProfile(caseData: GameCase): ScenarioProfile {
  const objects = new Map<string, GameCase['board'][number]['object']>()
  for (const cell of caseData.board) if (cell.object) { const existing = objects.get(cell.object.id); if (existing && (existing.label !== cell.object.label || existing.icon !== cell.object.icon || existing.occupiable !== cell.object.occupiable)) throw new Error(`Incompatible object definitions for ${cell.object.id}.`); objects.set(cell.object.id, { ...cell.object }) }
  return { id: caseData.id, title: caseData.title, intro: caseData.intro, difficulty: caseData.difficulty, rows: caseData.rows, columns: caseData.columns, characters: caseData.characters.map(character => ({ id: character.id, name: character.name, avatar: character.avatar, isVictim: character.isVictim })), zones: caseData.zones.map(zone => ({ ...zone })), objects: [...objects.values()].map(object => ({ ...object! })) }
}
