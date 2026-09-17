import type { BoardObject, ObjectAppearance, ObjectVisualProfile } from '../types'
import bathtub from '../../assets/objects/contextual/banera.png'
import outdoorBench from '../../assets/objects/contextual/banco_exterior.png'
import diningChair from '../../assets/objects/contextual/silla_comedor.png'
import officeChair from '../../assets/objects/contextual/silla_oficina.png'
import sofa from '../../assets/objects/contextual/sofa.png'
import stool from '../../assets/objects/contextual/taburete.png'
import sunLounger from '../../assets/objects/contextual/tumbona.png'
import toilet from '../../assets/objects/contextual/retrete.png'
import wheelchair from '../../assets/objects/contextual/d1/wheelchair.png'
import cafeCounter from '../../assets/objects/contextual/d1/cafe_counter.png'
import coffeeMachine from '../../assets/objects/contextual/d1/coffee_machine.png'
import roundTable from '../../assets/objects/contextual/d1/round_table.png'
import workbench from '../../assets/objects/contextual/d1/workbench.png'
import tires from '../../assets/objects/contextual/d1/tires.png'
import meetingTable from '../../assets/objects/contextual/d1/meeting_table.png'
import lockerBank from '../../assets/objects/contextual/d1/locker_bank.png'
import lifeguardChair from '../../assets/objects/contextual/d1/lifeguard_chair.png'
import shoppingCart from '../../assets/objects/contextual/d1/shopping_cart.png'
import cinemaSeatRow from '../../assets/objects/contextual/d1/cinema_seat_row.png'
import projector from '../../assets/objects/contextual/d1/projector.png'
import readingTable from '../../assets/objects/contextual/d1/reading_table.png'
import vendingMachine from '../../assets/objects/contextual/d1/vending_machine.png'
import ticketCounter from '../../assets/objects/contextual/d1/ticket_counter.png'
import gymBench from '../../assets/objects/contextual/d1/gym_bench.png'
import treadmill from '../../assets/objects/contextual/d1/treadmill.png'
import dumbbells from '../../assets/objects/contextual/d1/dumbbells.png'
import displayCase from '../../assets/objects/contextual/d1/display_case.png'
import restorationTable from '../../assets/objects/contextual/d1/restoration_table.png'
import piano from '../../assets/objects/contextual/d1/piano.png'
import dressingTable from '../../assets/objects/contextual/d1/dressing_table.png'
import coatRack from '../../assets/objects/contextual/d1/coat_rack.png'
import stageSpotlight from '../../assets/objects/contextual/d1/stage_spotlight.png'
import freezer from '../../assets/objects/contextual/d1/freezer.png'

export interface ObjectAppearanceDefinition { src: string; label: string; scale?: number; visualProfile?: ObjectVisualProfile }

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
  stool: { src: stool, label: 'Taburete', scale: 0.7 },
  wheelchair: { src: wheelchair, label: 'Silla de ruedas', scale: 0.92, visualProfile: 'standard' },
  cafeCounter: { src: cafeCounter, label: 'Barra de cafetería', scale: 0.96, visualProfile: 'wide' },
  coffeeMachine: { src: coffeeMachine, label: 'Cafetera', scale: 0.84, visualProfile: 'standard' },
  roundTable: { src: roundTable, label: 'Mesa redonda', scale: 0.9, visualProfile: 'standard' },
  workbench: { src: workbench, label: 'Banco de trabajo', scale: 0.96, visualProfile: 'wide' },
  tires: { src: tires, label: 'Neumáticos', scale: 0.88, visualProfile: 'standard' },
  meetingTable: { src: meetingTable, label: 'Mesa de reuniones', scale: 0.94, visualProfile: 'wide' },
  lockerBank: { src: lockerBank, label: 'Taquillas', scale: 0.92, visualProfile: 'tall' },
  lifeguardChair: { src: lifeguardChair, label: 'Silla de socorrista', scale: 0.86, visualProfile: 'tall' },
  shoppingCart: { src: shoppingCart, label: 'Carrito de compra', scale: 0.88, visualProfile: 'standard' },
  cinemaSeatRow: { src: cinemaSeatRow, label: 'Fila de butacas', scale: 0.96, visualProfile: 'wide' },
  projector: { src: projector, label: 'Proyector', scale: 0.86, visualProfile: 'standard' },
  readingTable: { src: readingTable, label: 'Mesa de lectura', scale: 0.94, visualProfile: 'wide' },
  vendingMachine: { src: vendingMachine, label: 'Máquina expendedora', scale: 0.92, visualProfile: 'tall' },
  ticketCounter: { src: ticketCounter, label: 'Mostrador de billetes', scale: 0.94, visualProfile: 'wide' },
  gymBench: { src: gymBench, label: 'Banco de gimnasio', scale: 0.92, visualProfile: 'wide' },
  treadmill: { src: treadmill, label: 'Cinta de correr', scale: 1, visualProfile: 'tall' },
  dumbbells: { src: dumbbells, label: 'Mancuernas', scale: 0.82, visualProfile: 'compact' },
  displayCase: { src: displayCase, label: 'Vitrina', scale: 0.94, visualProfile: 'wide' },
  restorationTable: { src: restorationTable, label: 'Mesa de restauración', scale: 0.94, visualProfile: 'wide' },
  piano: { src: piano, label: 'Piano', scale: 0.96, visualProfile: 'wide' },
  dressingTable: { src: dressingTable, label: 'Tocador', scale: 0.92, visualProfile: 'wide' },
  coatRack: { src: coatRack, label: 'Perchero', scale: 0.88, visualProfile: 'tall' },
  stageSpotlight: { src: stageSpotlight, label: 'Foco de escenario', scale: 0.82, visualProfile: 'compact' },
  freezer: { src: freezer, label: 'Congelador', scale: 0.94, visualProfile: 'wide' },
}

export const isObjectAppearance = (value: unknown): value is ObjectAppearance => typeof value === 'string' && value in objectAppearanceCatalog
export const resolveObjectVisualProfile = (object: Pick<BoardObject, 'visualProfile' | 'appearance'>): ObjectVisualProfile => object.visualProfile ?? (object.appearance && isObjectAppearance(object.appearance) ? objectAppearanceCatalog[object.appearance].visualProfile ?? 'standard' : 'standard')

export function resolveObjectAppearance(object: Pick<BoardObject, 'appearance' | 'icon' | 'label'>): ObjectAppearanceDefinition {
  return object.appearance && isObjectAppearance(object.appearance) ? objectAppearanceCatalog[object.appearance] : { src: object.icon, label: object.label }
}

export function resolveObjectAppearanceScale(object: Pick<BoardObject, 'appearance'>): number {
  return object.appearance && isObjectAppearance(object.appearance)
    ? normaliseObjectAppearanceScale(objectAppearanceCatalog[object.appearance].scale)
    : DEFAULT_OBJECT_APPEARANCE_SCALE
}
