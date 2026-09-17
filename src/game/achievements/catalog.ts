export type AchievementCategory = 'progress' | 'skill' | 'daily' | 'infinite'
export type AchievementId = 'first-investigation' | 'investigations-10' | 'investigations-50' | 'investigations-100' | 'all-difficulties-unlocked' | 'normal-d1-complete' | 'normal-d2-complete' | 'normal-d3-complete' | 'normal-d4-complete' | 'normal-d5-complete' | 'normal-all-75' | 'first-perfect' | 'perfect-10' | 'perfect-d5' | 'first-daily' | 'daily-streak-3' | 'daily-streak-7' | 'daily-streak-30' | 'first-infinite' | 'infinite-10' | 'infinite-50'
export interface AchievementDefinition { id: AchievementId; category: AchievementCategory; title: string; description: string }

export const achievementCatalog = [
  { id: 'first-investigation', category: 'progress', title: 'Primer expediente', description: 'Resuelve tu primer expediente.' },
  { id: 'investigations-10', category: 'progress', title: 'Ya le coges el truco', description: 'Resuelve 10 expedientes distintos.' },
  { id: 'investigations-50', category: 'progress', title: 'Investigador curtido', description: 'Resuelve 50 expedientes distintos.' },
  { id: 'investigations-100', category: 'progress', title: 'Centenar de casos', description: 'Resuelve 100 expedientes distintos.' },
  { id: 'all-difficulties-unlocked', category: 'progress', title: 'Sin límites', description: 'Desbloquea las cinco dificultades.' },
  { id: 'normal-d1-complete', category: 'progress', title: 'Fundamentos dominados', description: 'Completa los 15 expedientes de dificultad ★.' },
  { id: 'normal-d2-complete', category: 'progress', title: 'Paso firme', description: 'Completa los 15 expedientes de dificultad ★★.' },
  { id: 'normal-d3-complete', category: 'progress', title: 'Mente afilada', description: 'Completa los 15 expedientes de dificultad ★★★.' },
  { id: 'normal-d4-complete', category: 'progress', title: 'Investigador experto', description: 'Completa los 15 expedientes de dificultad ★★★★.' },
  { id: 'normal-d5-complete', category: 'progress', title: 'Maestro de la deducción', description: 'Completa los 15 expedientes de dificultad ★★★★★.' },
  { id: 'normal-all-75', category: 'progress', title: 'Archivo principal completo', description: 'Completa los 75 Casos Normales.' },
  { id: 'first-perfect', category: 'skill', title: 'Caso impecable', description: 'Resuelve un expediente sin utilizar ninguna ayuda.' },
  { id: 'perfect-10', category: 'skill', title: 'Perfeccionista', description: 'Resuelve 10 expedientes distintos sin utilizar ayudas.' },
  { id: 'perfect-d5', category: 'skill', title: 'Sangre fría', description: 'Resuelve un expediente de dificultad ★★★★★ sin utilizar ayudas.' },
  { id: 'first-daily', category: 'daily', title: 'Cita con el caso', description: 'Resuelve tu primer Caso Diario.' },
  { id: 'daily-streak-3', category: 'daily', title: 'Tres días tras la pista', description: 'Alcanza una racha de 3 Casos Diarios.' },
  { id: 'daily-streak-7', category: 'daily', title: 'Semana de guardia', description: 'Alcanza una racha de 7 Casos Diarios.' },
  { id: 'daily-streak-30', category: 'daily', title: 'Sin perder el rastro', description: 'Alcanza una racha de 30 Casos Diarios.' },
  { id: 'first-infinite', category: 'infinite', title: 'Territorio desconocido', description: 'Resuelve tu primer Caso Infinito.' },
  { id: 'infinite-10', category: 'infinite', title: 'Más allá del archivo', description: 'Resuelve 10 Casos Infinitos distintos.' },
  { id: 'infinite-50', category: 'infinite', title: 'Pozo sin fondo', description: 'Resuelve 50 Casos Infinitos distintos.' },
] as const satisfies readonly AchievementDefinition[]

export const isAchievementId = (value: unknown): value is AchievementId => typeof value === 'string' && achievementCatalog.some(achievement => achievement.id === value)
export const getAchievement = (id: AchievementId) => achievementCatalog.find(achievement => achievement.id === id)!
