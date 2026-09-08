import type { Character } from '../game/types'

export function CharacterCard({ character, selected, placed, onSelect }: { character: Character; selected: boolean; placed: boolean; onSelect: () => void }) {
  const state = selected ? 'SELECCIONADO' : placed ? 'EN ESCENA' : 'SIN COLOCAR'
  return <button className={`character-card ${selected ? 'selected' : ''} ${placed ? 'placed-card' : ''} ${character.isVictim ? 'victim' : ''}`} onClick={onSelect} aria-pressed={selected}>
    <span className="avatar" aria-hidden="true">{character.avatar}</span>
    <span className="character-info">
      <span className="character-heading"><strong>{character.name}</strong><em>{state}</em></span>
      {character.isVictim && <small>VÍCTIMA</small>}
      <span className="clue-list">{character.clues.map(clue => <span className="clue" key={clue.id}>{clue.text}</span>)}</span>
    </span>
  </button>
}
