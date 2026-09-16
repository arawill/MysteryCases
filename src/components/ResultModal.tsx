import type { Character } from '../game/types'
import { CharacterAvatar } from './CharacterAvatar'

export function ResultModal({ killer, onClose }: { killer: Character; onClose: () => void }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="result-title" aria-describedby="result-description">
    <div className="modal">
      <span className="stamp">EXPEDIENTE CERRADO</span>
      <h2 id="result-title">Caso resuelto</h2>
      <p id="result-description">Has reconstruido correctamente la escena.</p>
      <div className="result-divider" />
      <div className={`killer-avatar ${killer.avatarImage ? 'avatar-image-shell' : ''}`} aria-hidden="true"><CharacterAvatar character={killer} /></div>
      <p className="eyebrow">EL ASESINO ES</p>
      <h3>{killer.name}</h3>
      {killer.roleLabel && <p className="character-role">{killer.roleLabel}</p>}
      <button className="primary" onClick={onClose}>VOLVER AL CASO</button>
    </div>
  </div>
}
