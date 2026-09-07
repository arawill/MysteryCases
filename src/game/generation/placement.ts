import { findKiller, getCell } from '../rules'
import type { GameCase, Placement } from '../types'
import { shuffle, type SeededRandom } from './random'
import type { GenerationTemplate } from './types'

export interface PlacementGenerationResult { solution: Placement[]; attempts: number }
const orderedPlacements = (template: GenerationTemplate, placements: Placement[]): Placement[] => template.characters.map(character => { const placement = placements.find(candidate => candidate.characterId === character.id); if (!placement) throw new Error(`Missing placement for ${character.id}.`); return { characterId: placement.characterId, position: { ...placement.position } } })
const provisionalCase = (template: GenerationTemplate, solution: Placement[]): GameCase => ({ id: template.id, title: template.title, intro: template.intro, difficulty: template.difficulty, rows: template.rows, columns: template.columns, zones: template.zones, board: template.board, characters: template.characters.map(character => ({ ...character, clues: [] })), solution })
export function generateValidPlacement(template: GenerationTemplate, random: SeededRandom, maxNodes: number): PlacementGenerationResult {
  if (template.characters.length !== template.rows || template.characters.length !== template.columns) throw new Error('Template characters must match rows and columns.')
  if (template.characters.filter(character => character.isVictim).length !== 1) throw new Error('Template must contain exactly one victim.')
  const cells = template.board.filter(cell => cell.occupiable); let attempts = 0; const searchOrder = shuffle(template.characters, random); const placements: Placement[] = []
  const search = (index: number): boolean => {
    if (index === searchOrder.length) { const solution = orderedPlacements(template, placements); return findKiller(provisionalCase(template, solution), solution) !== null }
    const character = searchOrder[index]; const usedRows = new Set(placements.map(placement => placement.position.row)); const usedColumns = new Set(placements.map(placement => placement.position.column))
    for (const cell of shuffle(cells, random)) {
      if (attempts >= maxNodes) return false
      if (usedRows.has(cell.row) || usedColumns.has(cell.column)) continue
      attempts += 1; placements.push({ characterId: character.id, position: { row: cell.row, column: cell.column } })
      const victim = template.characters.find(candidate => candidate.isVictim); const victimPlacement = placements.find(candidate => candidate.characterId === victim?.id); const victimCell = victimPlacement ? getCell(template.board, victimPlacement.position) : undefined
      const inVictimZone = victimCell ? placements.filter(candidate => getCell(template.board, candidate.position)?.zoneId === victimCell.zoneId).length : 0
      if (inVictimZone <= 2 && search(index + 1)) return true
      placements.pop()
    }
    return false
  }
  if (!search(0)) throw new Error('Unable to generate a valid placement with a unique killer.')
  return { solution: orderedPlacements(template, placements), attempts }
}
