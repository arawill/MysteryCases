import type { BoardObject, ObjectAppearance, ObjectVisualProfile } from '../types'
import bathtub from '../../assets/objects/contextual/banera.png'
import outdoorBench from '../../assets/objects/contextual/banco_exterior.png'
import diningChair from '../../assets/objects/contextual/silla_comedor.png'
import officeChair from '../../assets/objects/contextual/silla_oficina.png'
import sofa from '../../assets/objects/contextual/sofa.png'
import stool from '../../assets/objects/contextual/taburete.png'
import sunLounger from '../../assets/objects/contextual/tumbona.png'
import toilet from '../../assets/objects/contextual/retrete.png'

export interface ObjectAppearanceDefinition { src: string; label: string; scale?: number }

export const DEFAULT_OBJECT_APPEARANCE_SCALE = 1
const MIN_OBJECT_APPEARANCE_SCALE = 0.5
const MAX_OBJECT_APPEARANCE_SCALE = 1.2

export function normaliseObjectAppearanceScale(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_OBJECT_APPEARANCE_SCALE && value <= MAX_OBJECT_APPEARANCE_SCALE
    ? value
    : DEFAULT_OBJECT_APPEARANCE_SCALE
}

export const objectAppearanceCatalog: Record<ObjectAppearance, ObjectAppearanceDefinition> = {
  sunLounger: { src: sunLounger, label: 'Tumbona', scale: 1 },
  toilet: { src: toilet, label: 'Retrete', scale: 0.9 },
  diningChair: { src: diningChair, label: 'Silla de comedor', scale: 0.92 },
  officeChair: { src: officeChair, label: 'Silla de oficina', scale: 1.1 },
  sofa: { src: sofa, label: 'Sofá', scale: 1 },
  bathtub: { src: bathtub, label: 'Bañera', scale: 0.94 },
  outdoorBench: { src: outdoorBench, label: 'Banco exterior', scale: 1 },
  stool: { src: stool, label: 'Taburete', scale: 0.9 },
}

export const isObjectAppearance = (value: unknown): value is ObjectAppearance => typeof value === 'string' && value in objectAppearanceCatalog
export const resolveObjectVisualProfile = (object: Pick<BoardObject, 'visualProfile'>): ObjectVisualProfile => object.visualProfile ?? 'standard'

export function resolveObjectAppearance(object: Pick<BoardObject, 'appearance' | 'icon' | 'label'>): ObjectAppearanceDefinition {
  return object.appearance && isObjectAppearance(object.appearance) ? objectAppearanceCatalog[object.appearance] : { src: object.icon, label: object.label }
}

export function resolveObjectAppearanceScale(object: Pick<BoardObject, 'appearance'>): number {
  return object.appearance && isObjectAppearance(object.appearance)
    ? normaliseObjectAppearanceScale(objectAppearanceCatalog[object.appearance].scale)
    : DEFAULT_OBJECT_APPEARANCE_SCALE
}
