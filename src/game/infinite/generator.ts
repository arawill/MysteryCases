import { generateProceduralCase, type GeneratedProceduralCase } from '../generation/proceduralCase'
import type { DifficultyRating } from '../types'
export const getInfiniteCaseId = (difficulty: DifficultyRating, seed: number) => `infinite-d${difficulty}-s${seed}`
export const generateInfiniteCase = ({ difficulty, seed }: { difficulty: DifficultyRating; seed: number }): GeneratedProceduralCase => generateProceduralCase({ id: getInfiniteCaseId(difficulty, seed), title: 'Expediente infinito', intro: 'Un nuevo expediente ha sido generado. Reconstruye la escena y descubre quién se quedó a solas con la víctima.', difficulty, seed })
const cache = new Map<string, GeneratedProceduralCase>()
export function getCachedInfiniteCase(request: { difficulty: DifficultyRating; seed: number }) { const key = getInfiniteCaseId(request.difficulty, request.seed), existing = cache.get(key); if (existing) return existing; const generated = generateInfiniteCase(request); cache.set(key, generated); return generated }
export function clearInfiniteCaseCache() { cache.clear() }
