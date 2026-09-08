const pad = (value: number) => String(value).padStart(2, '0')
export function getDailyDateKey(date: Date): string { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
export function getDailyCaseId(date: Date): string { return `daily-${getDailyDateKey(date)}` }
export function getDailySeed(date: Date): number { const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000); return (Math.imul(day, 2654435761) + 2246822519) >>> 0 }
export function formatDailyDate(date: Date): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) }
