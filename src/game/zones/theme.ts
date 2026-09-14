export interface ZoneTheme { background: string; lightBackground: string; dot: string }
export const zoneTheme: Record<string, ZoneTheme> = {
  cafe: { background: '#383124', lightBackground: '#e7d6b9', dot: '#d39c4c' },
  kitchen: { background: '#20383a', lightBackground: '#d2e0db', dot: '#54b8bd' },
  storage: { background: '#343824', lightBackground: '#dde0c6', dot: '#aab84f' },
  bathroom: { background: '#302a42', lightBackground: '#dfd8e9', dot: '#9985d4' },
}
export const fallbackZoneTheme: ZoneTheme = { background: '#2b3030', lightBackground: '#dedbd2', dot: '#919898' }
