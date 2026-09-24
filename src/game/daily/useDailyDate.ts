import { useEffect, useState } from 'react'
import { getDailyDateKey } from './date'
import { subscribeToDailyDateRollover } from './rollover'

export function useDailyDate(): Date {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => subscribeToDailyDateRollover(next => {
    setDate(current => getDailyDateKey(current) === getDailyDateKey(next) ? current : next)
  }), [])
  return date
}
