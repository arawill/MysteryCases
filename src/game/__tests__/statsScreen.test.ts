import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StatsScreen composition', () => {
  it('keeps every investigation summary section in the profile screen', () => {
    const source = readFileSync(new URL('../../screens/StatsScreen.tsx', import.meta.url), 'utf8')
    for (const heading of ['ARCHIVO PRINCIPAL', 'CASO DIARIO', 'CASO INFINITO', 'AYUDAS DE INVESTIGACIÓN', 'RENDIMIENTO REGISTRADO', 'ÚLTIMOS LOGROS', 'LOGROS']) expect(source).toContain(heading)
  })
})
