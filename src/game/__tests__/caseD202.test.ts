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
    expect(caseD202.solution).toEqual([
      { characterId: 'female-031', position: { row: 1, column: 3 } },
      { characterId: 'male-049', position: { row: 2, column: 6 } },
      { characterId: 'female-088', position: { row: 3, column: 4 } },
      { characterId: 'male-041', position: { row: 4, column: 5 } },
      { characterId: 'female-037', position: { row: 5, column: 1 } },
      { characterId: 'male-029', position: { row: 6, column: 7 } },
      { characterId: 'female-035', position: { row: 7, column: 2 } },
    ])
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
        'Estaba en ensayos.',
        'Estaba junto a la mesa de laboratorio.',
      ],
      Héctor: [
        'Estaba en cápsulas.',
        'Estaba junto a la cápsula de cristal.',
      ],
      Miriam: ['Estaba en limpieza.', 'Estaba junto al arco de limpieza.'],
      Gabriel: ['Estaba en la cuarta fila.', 'Estaba en el archivo.'],
      Alicia: ['Estaba en la primera columna.', 'Estaba en análisis.'],
      Diego: [
        'Estaba en la séptima columna.',
        'Estaba al norte de Eva.',
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

  it('uses the vertical Limpieza zone and places someone in each laboratory zone', () => {
    expect(caseD202.board.find(cell => cell.row === 3 && cell.column === 4)?.zoneId).toBe('decontamination')
    expect(caseD202.board.filter(cell => cell.zoneId === 'decontamination').map(cell => `${cell.row}:${cell.column}`)).toEqual(['3:4', '4:4', '5:4'])
    const occupantsByZone = Object.fromEntries(caseD202.zones.map(zone => [zone.id, caseD202.solution
      .filter(placement => caseD202.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === zone.id)
      .map(placement => placement.characterId)]))
    expect(occupantsByZone).toEqual({
      mainLab: ['female-031'],
      containment: ['male-049'],
      decontamination: ['female-088'],
      bioArchive: ['male-041'],
      analysis: ['female-037'],
      observation: ['male-029', 'female-035'],
    })
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
