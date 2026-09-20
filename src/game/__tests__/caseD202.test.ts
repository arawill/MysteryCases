import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Board } from '../../components/Board'
import { caseD202 } from '../../data/cases/caseD202'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { nameCatalog } from '../characters/nameCatalog'
import { areAllCluesSatisfied } from '../clues'
import { resolveObjectAppearance, resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprintBounds, isFootprintReservedCell, isObjectPositionOccupiable } from '../objects/footprints'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const objectCells = (id: string) => caseD202.board.filter(cell => cell.object?.id === id)

describe('manual D2 case 02', () => {
  it('is registered as a 7×7 D2 case with seven canonical rows and columns', () => {
    expect(getManualNormalCase(2, 2)).toBe(caseD202)
    expect(caseD202.rows).toBe(7)
    expect(caseD202.columns).toBe(7)
    expect(caseD202.board).toHaveLength(49)
    expect(caseD202.characters).toHaveLength(7)
    expect(caseD202.characters.filter(character => character.isVictim)).toHaveLength(1)
    expect(caseD202.solution.some(placement => placement.characterId === 'female-035')).toBe(true)
    expect(caseD202.solution.map(placement => placement.position.row).sort((first, second) => first - second)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD202.solution.map(placement => placement.position.column).sort((first, second) => first - second)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD202.characters.every(character => nameCatalog.some(entry => entry.id === character.id && entry.name === character.name))).toBe(true)
  })

  it('uses all five approved objects with clear visible names, non-occupiable and non-overlapping footprints', () => {
    const expectations = [
      ['xenoLabBench', 'Mesa de laboratorio', ['1:1', '1:2'], 'wide'],
      ['specimenTank', 'Acuario de laboratorio', ['1:5', '1:6'], 'wide'],
      ['sampleAnalyzer', 'Máquina de análisis', ['4:2'], 'compact'],
      ['containmentPod', 'Cápsula de cristal', ['2:7'], 'tall'],
      ['decontaminationArch', 'Arco de limpieza', ['4:4'], 'tall'],
    ] as const
    const occupiedKeys: string[] = []
    for (const [id, label, expectedCells, profile] of expectations) {
      const cells = objectCells(id)
      expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(expectedCells)
      expect(cells[0].object?.label).toBe(label.toLocaleLowerCase('es'))
      expect(resolveObjectAppearance(cells[0].object!)).toMatchObject({ label })
      expect(cells.every(cell => !cell.occupiable && !isObjectPositionOccupiable(cell.object!, cell))).toBe(true)
      expect(cells.every(cell => cell.object?.footprint ? isFootprintReservedCell(cell.object, cell) : true)).toBe(true)
      expect(resolveObjectVisualProfile(cells[0].object!)).toBe(profile)
      occupiedKeys.push(...cells.map(cell => `${cell.row}:${cell.column}`))
    }
    expect(new Set(occupiedKeys).size).toBe(occupiedKeys.length)
    expect(getObjectFootprintBounds(objectCells('specimenTank')[0].object!, objectCells('specimenTank')[0])).toMatchObject({ rows: 1, columns: 2 })
    expect(getObjectFootprintBounds(objectCells('xenoLabBench')[0].object!, objectCells('xenoLabBench')[0])).toMatchObject({ rows: 1, columns: 2 })
  })

  it('renders complete short zone names on free anchors and keeps all clues visible and true', () => {
    for (const zone of caseD202.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = caseD202.board.find(candidate => candidate.row === anchor.row && candidate.column === anchor.column)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD202.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }
    expect(caseD202.zones.map(zone => zone.name)).toEqual(['Ensayos', 'Cápsulas', 'Análisis', 'Limpieza', 'Archivo', 'Control'])
    const markup = renderToStaticMarkup(createElement(Board, { ...caseD202, placements: caseD202.solution, excludedCells: [], onCellClick: () => {}, onCellContextMenu: () => {} }))
    for (const zone of caseD202.zones) {
      expect(markup).toContain(`>${zone.name}</span>`)
      expect(markup).not.toContain(`${zone.name}…`)
    }
    const visibleContent = [...caseD202.zones.map(zone => zone.name), ...caseD202.characters.flatMap(character => character.clues.map(clue => clue.text))].join(' ').toLocaleLowerCase('es')
    for (const obsolete of ['laboratorio principal', 'sala de contención', 'área de análisis', 'descontaminación', 'archivo biológico', 'observación', 'mesa de xenobiología', 'tanque de espécimen', 'analizador de muestras', 'cápsula de contención', 'arco de descontaminación']) expect(visibleContent).not.toContain(obsolete)
    expect(caseD202.characters.flatMap(character => character.clues).every(clue => clue.text.trim() !== '' && !clue.text.includes('…') && !clue.text.toLocaleLowerCase('es').includes('ocupaba'))).toBe(true)
    expect(areAllCluesSatisfied(caseD202, caseD202.solution)).toBe(true)
  })

  it('uses the final human-readable clue wording', () => {
    const cluesByCharacter = Object.fromEntries(
      caseD202.characters.map(character => [
        character.name,
        character.clues.map(clue => clue.text),
      ]),
    )

    expect(cluesByCharacter).toEqual({
      Claudia: [
        'Estaba en la primera fila.',
        'Estaba en la sala de ensayos.',
        'No estaba junto a la mesa de laboratorio.',
      ],
      Héctor: [
        'Estaba junto al acuario de laboratorio.',
        'Estaba en la sexta columna.',
      ],
      Miriam: [
        'Estaba en la tercera fila.',
        'Estaba en la primera columna.',
      ],
      Gabriel: ['Estaba en la cuarta fila.', 'Estaba en el archivo.'],
      Alicia: ['Estaba al sureste de la máquina de análisis.'],
      Diego: [
        'Estaba en la sexta fila.',
        'Estaba en la misma columna que la cápsula de cristal.',
      ],
      Eva: [],
    })
  })

  it('has one non-truncated canonical solution and identifies Diego alone with Eva', () => {
    expect(validateCaseDefinition(caseD202)).toEqual([])
    const solved = solveCaseWithStats(caseD202)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD202.solution)).toBe(true)
    expect(findKiller(caseD202, caseD202.solution)?.id).toBe('male-029')
    const control = caseD202.solution.filter(placement => caseD202.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === 'observation')
    expect(control.map(placement => placement.characterId).sort()).toEqual(['female-035', 'male-029'])
  })

  it('rejects every pairwise exchange through at least one visible clue', () => {
    for (let index = 0; index < caseD202.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseD202.solution.length; otherIndex += 1) {
      const first = caseD202.solution[index], second = caseD202.solution[otherIndex]
      const swapped = caseD202.solution.map(placement => placement.characterId === first.characterId
        ? { ...placement, position: { ...second.position } }
        : placement.characterId === second.characterId
          ? { ...placement, position: { ...first.position } }
          : placement)
      expect(areAllCluesSatisfied(caseD202, swapped)).toBe(false)
    }
  })
})
