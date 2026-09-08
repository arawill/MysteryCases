export interface ZoneTheme { background: string; dot: string }
export const zoneTheme: Record<string, ZoneTheme> = {
  cafe: { background: '#383124', dot: '#d39c4c' },
  kitchen: { background: '#20383a', dot: '#54b8bd' },
  storage: { background: '#343824', dot: '#aab84f' },
  bathroom: { background: '#302a42', dot: '#9985d4' },
}
export const fallbackZoneTheme: ZoneTheme = { background: '#2b3030', dot: '#919898' }
