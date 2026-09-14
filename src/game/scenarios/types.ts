import type { BoardObject, Zone } from '../types'

/** A visual scenario vocabulary only; never contains a puzzle or people. */
export interface ScenarioPack {
  id: string
  name: string
  zones: Zone[]
  objects: BoardObject[]
}
