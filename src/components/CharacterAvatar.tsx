import type { Character } from '../game/types'
import '../styles/avatars.css'

/** Decorative by default when the character name is already visible nearby. */
export function CharacterAvatar({ character, label }: { character: Pick<Character, 'avatar' | 'avatarImage'>; label?: string }) {
  return <span className={`character-avatar ${character.avatarImage ? 'character-avatar-image' : 'character-avatar-emoji'}`} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
    {character.avatarImage ? <img src={character.avatarImage} alt="" /> : character.avatar}
  </span>
}
