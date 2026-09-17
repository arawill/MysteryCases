import type { BoardObject, ObjectAppearance, ObjectVisualProfile } from '../types'
import bathtub from '../../assets/objects/contextual/banera.png'
import outdoorBench from '../../assets/objects/contextual/banco_exterior.png'
import diningChair from '../../assets/objects/contextual/silla_comedor.png'
import officeChair from '../../assets/objects/contextual/silla_oficina.png'
import sofa from '../../assets/objects/contextual/sofa.png'
import stool from '../../assets/objects/contextual/taburete.png'
import sunLounger from '../../assets/objects/contextual/tumbona.png'
import toilet from '../../assets/objects/contextual/retrete.png'

export interface ObjectAppearanceDefinition { src: string; label: string }

export const objectAppearanceCatalog: Record<ObjectAppearance, ObjectAppearanceDefinition> = {
  sunLounger: { src: sunLounger, label: 'Tumbona' },
  toilet: { src: toilet, label: 'Retrete' },
  diningChair: { src: diningChair, label: 'Silla de comedor' },
  officeChair: { src: officeChair, label: 'Silla de oficina' },
  sofa: { src: sofa, label: 'Sofá' },
  bathtub: { src: bathtub, label: 'Bañera' },
  outdoorBench: { src: outdoorBench, label: 'Banco exterior' },
  stool: { src: stool, label: 'Taburete' },
}

export const isObjectAppearance = (value: unknown): value is ObjectAppearance => typeof value === 'string' && value in objectAppearanceCatalog
export const resolveObjectVisualProfile = (object: Pick<BoardObject, 'visualProfile'>): ObjectVisualProfile => object.visualProfile ?? 'standard'

export function resolveObjectAppearance(object: Pick<BoardObject, 'appearance' | 'icon' | 'label'>): ObjectAppearanceDefinition {
  return object.appearance && isObjectAppearance(object.appearance) ? objectAppearanceCatalog[object.appearance] : { src: object.icon, label: object.label }
}
