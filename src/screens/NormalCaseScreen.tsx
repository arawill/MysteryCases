import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars, isDifficultyRating } from '../game/difficulty'
import { getCachedNormalCase } from '../game/normal/generator'
import { isDifficultyUnlocked, loadNormalProgress, markNormalCaseCompleted } from '../game/persistence/normalProgress'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'

function LoadedNormalCase({ difficulty, caseNumber }: { difficulty: DifficultyRating; caseNumber: number }) { const generated = useMemo(() => getCachedNormalCase({ difficulty, caseNumber }), [difficulty, caseNumber]); const [notice, setNotice] = useState(''); const complete = () => { const before = loadNormalProgress(); const wasNextLocked = difficulty < 5 && !isDifficultyUnlocked((difficulty + 1) as DifficultyRating, before); const next = markNormalCaseCompleted(difficulty, caseNumber); if (wasNextLocked && difficulty < 5 && isDifficultyUnlocked((difficulty + 1) as DifficultyRating, next)) setNotice(`Has desbloqueado la dificultad ${formatDifficultyStars((difficulty + 1) as DifficultyRating)}.`) }; return <div className="case-route"><AppHeader back/><div className="normal-case-notice">{notice && <p className="unlock-banner" role="status">{notice}</p>}<GameScreen gameCase={generated.caseData} eyebrowLabel={`CASOS NORMALES · ${formatDifficultyStars(difficulty)} · EXPEDIENTE ${String(caseNumber).padStart(2, '0')}`} onCaseCompleted={complete} recordGlobalCompletion={false}/></div></div> }

export function NormalCaseScreen() { const { difficulty: rawDifficulty, caseNumber: rawCaseNumber } = useParams(); const difficulty = Number(rawDifficulty), caseNumber = Number(rawCaseNumber); const valid = isDifficultyRating(difficulty) && Number.isInteger(caseNumber) && caseNumber >= 1 && caseNumber <= 80; const progress = loadNormalProgress(); if (!valid || !isDifficultyUnlocked(difficulty, progress)) return <Navigate to="/normal" replace/>; return <LoadedNormalCase difficulty={difficulty} caseNumber={caseNumber}/> }
