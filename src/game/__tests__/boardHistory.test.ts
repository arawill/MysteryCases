import { describe, expect, it } from 'vitest'
import { recordBoardState, undoBoardState, type InvestigationBoardState } from '../boardState'

const empty = (): InvestigationBoardState => ({ placements: [], manualExcludedCells: [] })
const lucia = { characterId: 'lucia', position: { row: 1, column: 3 } }
const movedLucia = { characterId: 'lucia', position: { row: 2, column: 4 } }
const cross = { row: 2, column: 4 }

function perform(
  state: InvestigationBoardState,
  history: InvestigationBoardState[],
  next: InvestigationBoardState,
) {
  return { state: next, history: recordBoardState(history, state) }
}

describe('board undo history', () => {
  it('undoes placing a character', () => {
    const action = perform(empty(), [], { placements: [lucia], manualExcludedCells: [] })
    expect(undoBoardState(action.state, action.history)?.state).toEqual(empty())
  })

  it('undoes moving a character', () => {
    const before = { placements: [lucia], manualExcludedCells: [] }
    const action = perform(before, [], { placements: [movedLucia], manualExcludedCells: [] })
    expect(undoBoardState(action.state, action.history)?.state).toEqual(before)
  })

  it('undoes removing a character', () => {
    const before = { placements: [lucia], manualExcludedCells: [] }
    const action = perform(before, [], empty())
    expect(undoBoardState(action.state, action.history)?.state).toEqual(before)
  })

  it('undoes adding and removing a manual exclusion', () => {
    const added = perform(empty(), [], { placements: [], manualExcludedCells: [cross] })
    const withoutCross = undoBoardState(added.state, added.history)
    expect(withoutCross?.state.manualExcludedCells).toEqual([])

    const removed = perform({ placements: [], manualExcludedCells: [cross] }, [], empty())
    expect(undoBoardState(removed.state, removed.history)?.state.manualExcludedCells).toEqual([cross])
  })

  it('undoes reset and restores both placements and manual exclusions', () => {
    const before = { placements: [lucia], manualExcludedCells: [{ row: 1, column: 1 }, cross, { row: 3, column: 2 }] }
    const action = perform(before, [], empty())
    expect(undoBoardState(action.state, action.history)?.state).toEqual(before)
  })

  it('restores the removed exclusion when placement over it is undone', () => {
    const before = { placements: [lucia], manualExcludedCells: [cross] }
    const action = perform(before, [], { placements: [movedLucia], manualExcludedCells: [] })
    expect(undoBoardState(action.state, action.history)?.state).toEqual(before)
  })

  it('keeps current hint and position-check usage because history stores only board state', () => {
    const before = { placements: [lucia], manualExcludedCells: [cross] }
    const history = recordBoardState([], before)
    const current = {
      placements: [], manualExcludedCells: [],
      hintsUsed: { review: 4, exclusion: 3, reveal: 2 }, positionChecksUsed: 2,
    }
    const undone = undoBoardState(current, history)
    expect(undone?.state).toMatchObject({ ...before, hintsUsed: current.hintsUsed, positionChecksUsed: 2 })
    expect(history[0]).not.toHaveProperty('hintsUsed')
    expect(history[0]).not.toHaveProperty('positionChecksUsed')
  })

  it('uses defensive snapshots and returns null for empty history', () => {
    const state = { placements: [lucia], manualExcludedCells: [cross] }
    const original = structuredClone(state)
    const history = recordBoardState([], state)
    state.placements[0].position.row = 6
    state.manualExcludedCells[0].column = 6
    const undone = undoBoardState(state, history)
    expect(undone?.state).toEqual(original)
    undone!.state.placements[0].position.row = 5
    expect(history[0].placements[0].position.row).toBe(1)
    expect(undoBoardState(state, [])).toBeNull()
  })
})
