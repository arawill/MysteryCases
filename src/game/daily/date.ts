const pad = (value: number) => String(value).padStart(2, '0')
export function getDailyDateKey(date: Date): string { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
export function getDailyCaseId(date: Date): string { return `daily-${getDailyDateKey(date)}` }
export function getDailyPuzzleId(date: Date, difficulty: number): string { return `${getDailyCaseId(date)}-d${difficulty}` }
export function getDailySeed(date: Date): number { const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000); return (Math.imul(day, 2654435761) + 2246822519) >>> 0 }
export function getDailyDifficultySeed(date: Date, difficulty: number): number { const seed = getDailySeed(date); return difficulty === 1 ? seed : (seed + Math.imul(difficulty, 0x9e3779b1)) >>> 0 }
export function formatDailyDate(date: Date): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) }
