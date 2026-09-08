import type { Character } from '../game/types'

export function CharacterCard({ character, traitLabels = [], selected, placed, onSelect }: { character: Character; traitLabels?: string[]; selected: boolean; placed: boolean; onSelect: () => void }) {
  const state = selected ? 'SELECCIONADO' : placed ? 'EN ESCENA' : 'SIN COLOCAR'
  return <button className={`character-card ${selected ? 'selected' : ''} ${placed ? 'placed-card' : ''} ${character.isVictim ? 'victim' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className="avatar" aria-hidden="true">{character.avatar}</span>
    <span className="character-info">
      <span className="character-heading"><strong>{character.name}</strong><em>{state}</em></span>
      {character.isVictim && <small>VÍCTIMA</small>}
      {traitLabels.length > 0 && <span className="trait-list" aria-label={`Rasgos: ${traitLabels.join(', ')}`}>{traitLabels.map(label => <span className="trait-chip" key={label}>{label}</span>)}</span>}
      <span className="clue-list">{character.clues.map(clue => <span className="clue" key={clue.id}>{clue.text}</span>)}</span>
    </span>
  </button>
}
