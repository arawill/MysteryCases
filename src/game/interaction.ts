export type BoardInteractionMode = 'place' | 'exclude'

export function resolveBoardPrimaryAction(mode: BoardInteractionMode): 'place' | 'toggle' {
  return mode === 'exclude' ? 'toggle' : 'place'
}
