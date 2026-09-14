import type { BoardObject, Zone } from '../types'

export interface ScenarioRole { id: string; maleLabel: string; femaleLabel: string; maxPerCase: number }

/** A visual scenario vocabulary only; never contains a puzzle or people. */
export interface ScenarioPack {
  id: string
  name: string
  zones: Zone[]
  objects: BoardObject[]
  roles: ScenarioRole[]
}
