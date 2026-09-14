import { getDifficultyPreset } from '../difficultyPresets'
import type { ScenarioPack, ScenarioRole } from '../scenarios/types'
import type { DifficultyRating } from '../types'
import { createSeededRandom, shuffle } from '../generation/random'
import { avatarCatalog } from './avatarCatalog'
import { femaleNameCatalog, maleNameCatalog } from './nameCatalog'
import type { CharacterGender } from './types'
import type { GenerationCharacter } from '../generation/types'

const stream = (seed: number, salt: number) => createSeededRandom((seed ^ salt) >>> 0)
const genderCounts = (count: number, seed: number) => {
  const femaleMajority = stream(seed, 0x6d616a6f)() < .5
  const female = count % 2 === 0 ? count / 2 : Math.floor(count / 2) + (femaleMajority ? 1 : 0)
  return { female, male: count - female }
}
const roleLabel = (role: ScenarioRole, gender: CharacterGender) => gender === 'female' ? role.femaleLabel : role.maleLabel

export function buildCharacterRoster({ difficulty, seed, scenarioPack }: { difficulty: DifficultyRating; seed: number; scenarioPack: ScenarioPack }): GenerationCharacter[] {
  const count = getDifficultyPreset(difficulty).characterCount
  const counts = genderCounts(count, seed)
  const names = {
    female: shuffle(femaleNameCatalog, stream(seed, 0x666e616d)).slice(0, counts.female),
    male: shuffle(maleNameCatalog, stream(seed, 0x6d6e616d)).slice(0, counts.male),
  }
  const avatars = {
    female: shuffle(avatarCatalog.filter(avatar => avatar.gender === 'female'), stream(seed, 0x66617661)).slice(0, counts.female),
    male: shuffle(avatarCatalog.filter(avatar => avatar.gender === 'male'), stream(seed, 0x6d617661)).slice(0, counts.male),
  }
  const rolePool = scenarioPack.roles.flatMap(role => Array.from({ length: role.maxPerCase }, () => role))
  const roles = shuffle(rolePool, stream(seed, 0x726f6c65)).slice(0, count)
  const people: Omit<GenerationCharacter, 'id' | 'isVictim'>[] = []
  for (const gender of ['female', 'male'] as const) for (let index = 0; index < counts[gender]; index += 1) {
    const name = names[gender][index], avatar = avatars[gender][index], role = roles[people.length]
    people.push({ name: name.name, gender, avatar: '👤', avatarImage: avatar.image, roleId: role.id, roleLabel: roleLabel(role, gender) })
  }
  const roster = shuffle(people, stream(seed, 0x6f726465))
  const victimIndex = Math.floor(stream(seed, 0x76696374)() * roster.length)
  return roster.map((person, index) => ({ ...person, id: `person-${String(index + 1).padStart(2, '0')}`, isVictim: index === victimIndex }))
}

export const getGenderCountsForDifficulty = (difficulty: DifficultyRating, seed: number) => genderCounts(getDifficultyPreset(difficulty).characterCount, seed)
