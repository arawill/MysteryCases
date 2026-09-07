import { expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { findKiller } from '../rules'
import { analyzeCase } from '../analysis'
it('case001 conserva a Bruno como asesino derivado de la solución', () => { const analysis = analyzeCase(case001); expect(analysis.solution).toBeDefined(); expect(findKiller(case001, analysis.solution ?? [])?.id).toBe('bruno') })
