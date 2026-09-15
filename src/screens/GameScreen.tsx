import { useEffect, useMemo, useRef, useState } from 'react'
import { Board } from '../components/Board'
import { CharacterCard } from '../components/CharacterCard'
import { CharacterAvatar } from '../components/CharacterAvatar'
import { CheckpointModal } from '../components/CheckpointModal'
import { ResultModal } from '../components/ResultModal'
import { recordBoardState, undoBoardState, type InvestigationBoardState } from '../game/boardState'
import { formatDifficultyStars } from '../game/difficulty'
import { getAutomaticExcludedCells, mergeExcludedCells, positionKey } from '../game/exclusions'
import { addCheckpoint, deleteCheckpoint, restoreCheckpoint, resetInvestigationBoard } from '../game/checkpoints'
import { getExclusionHint, reviewInvestigation } from '../game/hints'
import { resolveBoardPrimaryAction, type BoardInteractionMode } from '../game/interaction'
import { recordCaseCompletion } from '../game/persistence/completion'
import { notifyCaseCompletionOnce, shouldPersistGameSession, type CaseCompletionPerformance } from '../game/completionNotification'
import { loadCaseSave, saveCase, type CaseSave } from '../game/persistence/caseSave'
import { checkCharacterPosition, getPositionCheckLimit } from '../game/positionChecks'
import { recordHintUse } from '../game/persistence/playerStats'
import { loadSettings } from '../game/persistence/settings'
import { canPlace, findKiller, isSolutionCorrect } from '../game/rules'
import { isTouchBoardLayout } from '../game/touchLayout'
import { getCharacterTraitLabels } from '../game/traits'
import type { BoardCell, Character, GameCase, Placement, Position } from '../game/types'

export type { CaseCompletionPerformance } from '../game/completionNotification'
interface GameScreenProps {
  gameCase: GameCase
  eyebrowLabel?: string
  onCompletionAcknowledged?: () => void
  onCaseCompleted?: (performance: CaseCompletionPerformance) => void
  recordGlobalCompletion?: boolean
  completionId?: string
}

function GameSession({ gameCase, eyebrowLabel, onCompletionAcknowledged, onCaseCompleted, recordGlobalCompletion = true, completionId }: GameScreenProps) {
  const initial = useMemo(() => loadCaseSave(gameCase.id, localStorage, gameCase), [gameCase])
  const [placements, setPlacements] = useState<Placement[]>(initial.placements)
  const [manualExcludedCells, setManualExcludedCells] = useState<Position[]>(initial.manualExcludedCells)
  const [hintsUsed, setHintsUsed] = useState(initial.hintsUsed)
  const [checkpoints, setCheckpoints] = useState(initial.checkpoints)
  const [positionChecksUsed, setPositionChecksUsed] = useState(initial.positionChecksUsed)
  const [checkpointPanelOpen, setCheckpointPanelOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(gameCase.characters[0]?.id ?? null)
  const [interactionMode, setInteractionMode] = useState<BoardInteractionMode>('place')
  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null)
  const [message, setMessage] = useState('Elige una persona y toca una celda del escenario.')
  const [history, setHistory] = useState<InvestigationBoardState[]>([])
  const [killer, setKiller] = useState<Character | null>(null)
  const [result, setResult] = useState(false)
  const shown = useRef(false)
  const completionRecorded = useRef(false)
  const victim = gameCase.characters.find(character => character.isVictim)
  const selected = gameCase.characters.find(character => character.id === selectedId)
  const auto = loadSettings().autoCrossout
  const automatic = useMemo(() => getAutomaticExcludedCells(gameCase.board, placements), [gameCase.board, placements])
  const excluded = useMemo(() => mergeExcludedCells(manualExcludedCells, auto ? automatic : []), [manualExcludedCells, automatic, auto])
  const label = eyebrowLabel ?? `${gameCase.id.toUpperCase()} · DEDUCCIÓN ESPACIAL`
  const positionCheckLimit = getPositionCheckLimit(gameCase)
  const positionChecksRemaining = Math.max(0, positionCheckLimit - positionChecksUsed)
  const currentSave: CaseSave = { saveVersion: 4, placements, manualExcludedCells, hintsUsed, checkpoints, positionChecksUsed }
  const rememberBoard = () => setHistory(items => recordBoardState(items, currentSave))

  useEffect(() => {
    if (!shouldPersistGameSession(completionRecorded)) return
    saveCase(gameCase.id, { placements, manualExcludedCells, hintsUsed, checkpoints, positionChecksUsed })
  }, [gameCase.id, placements, manualExcludedCells, hintsUsed, checkpoints, positionChecksUsed])
  useEffect(() => {
    if (result) shown.current = true
    else if (shown.current) { shown.current = false; onCompletionAcknowledged?.() }
  }, [result, onCompletionAcknowledged])

  const place = (cell: BoardCell) => {
    if (!selectedId) return setMessage('Selecciona primero una persona.')
    const check = canPlace(selectedId, cell, placements, gameCase.board)
    if (!check.ok) return setMessage(check.reason)
    rememberBoard()
    setPlacements(items => [...items.filter(item => item.characterId !== selectedId), { characterId: selectedId, position: { row: cell.row, column: cell.column } }])
    setManualExcludedCells(items => items.filter(item => positionKey(item) !== positionKey(cell)))
    setMessage(`${selected?.name} ocupa la fila ${cell.row}, columna ${cell.column}.`)
  }
  const toggle = (cell: BoardCell) => {
    const occupied = placements.some(placement => positionKey(placement.position) === positionKey(cell))
    if (!cell.occupiable || occupied) return
    const automaticExcluded = automatic.some(position => positionKey(position) === positionKey(cell))
    const manuallyExcluded = manualExcludedCells.some(position => positionKey(position) === positionKey(cell))
    if (auto && automaticExcluded && !manuallyExcluded) return setMessage('Esta casilla está descartada automáticamente.')
    rememberBoard()
    setManualExcludedCells(items => manuallyExcluded ? items.filter(item => positionKey(item) !== positionKey(cell)) : [...items, { row: cell.row, column: cell.column }])
    setMessage('Anotación de descarte actualizada.')
  }
  const primaryBoardAction = (cell: BoardCell) => {
    const mode = isTouchBoardLayout(window.innerWidth, window.matchMedia('(pointer: coarse)').matches) ? interactionMode : 'place'
    return resolveBoardPrimaryAction(mode) === 'place' ? place(cell) : toggle(cell)
  }
  const selectCharacter = (character: Character) => { setSelectedId(character.id); setInteractionMode('place'); setMessage(`${character.name} seleccionado/a. Ahora toca una celda.`) }
  const remove = () => {
    if (!selectedId || !placements.some(placement => placement.characterId === selectedId)) return setMessage('Selecciona una persona que esté en escena.')
    rememberBoard(); setPlacements(items => items.filter(item => item.characterId !== selectedId)); setMessage('Persona retirada del tablero.')
  }
  const undo = () => {
    const undone = undoBoardState(currentSave, history)
    if (!undone) return setMessage('No hay movimientos que deshacer.')
    setPlacements(undone.state.placements); setManualExcludedCells(undone.state.manualExcludedCells); setHistory(undone.history)
    setMessage('Último movimiento deshecho.')
  }
  const reset = () => {
    if (!window.confirm('¿Reiniciar la investigación y quitar todas las personas y descartes?')) return
    const cleared = resetInvestigationBoard(currentSave)
    rememberBoard(); setPlacements(cleared.placements); setManualExcludedCells(cleared.manualExcludedCells)
    setMessage('La escena está despejada. Tus puntos de guardado y usos de ayudas se conservan.')
  }
  const saveCheckpoint = (name: string, description: string) => {
    setCheckpoints(addCheckpoint(checkpoints, currentSave, name, description))
    setMessage('Punto de guardado creado.')
  }
  const restoreHypothesis = (id: string) => {
    const restored = restoreCheckpoint(currentSave, id)
    setPlacements(restored.placements); setManualExcludedCells(restored.manualExcludedCells); setHistory([])
    setMessage('Hipótesis restaurada. Tus usos de ayudas y comprobaciones se conservan.')
  }
  const chooseKiller = (id: string) => { setSelectedKillerId(id); const character = gameCase.characters.find(item => item.id === id); if (character) setMessage(`${character.name} señalado/a como sospechoso/a.`) }
  const review = () => {
    const hint = reviewInvestigation(gameCase, placements)
    setHintsUsed(value => ({ ...value, review: value.review + 1 })); recordHintUse('review')
    if (hint.status === 'contradiction' && hint.source === 'global') return setMessage(`La evidencia general entra en contradicción: ${hint.text}`)
    const name = hint.status === 'contradiction' ? gameCase.characters.find(character => character.id === hint.characterId)?.name : null
    setMessage(name ? `Hay una contradicción en las pistas de ${name}.` : 'No veo contradicciones directas. Eso no garantiza la solución final.')
  }
  const exclusion = () => {
    const hint = getExclusionHint(gameCase, placements, manualExcludedCells)
    if (!hint) return setMessage('No encuentro una exclusión nueva útil.')
    setHintsUsed(value => ({ ...value, exclusion: value.exclusion + 1 })); recordHintUse('exclusion')
    const name = gameCase.characters.find(character => character.id === hint.characterId)?.name
    setMessage(`Puedes descartar fila ${hint.position.row}, columna ${hint.position.column} para ${name}.`)
  }
  const checkPosition = () => {
    const checked = checkCharacterPosition(gameCase, currentSave, selectedId)
    switch (checked.status) {
      case 'noSelection': return setMessage('Selecciona primero una persona.')
      case 'unplaced': return setMessage('Coloca a la persona seleccionada antes de comprobar su posición.')
      case 'exhausted': return setMessage('No quedan comprobaciones de posición disponibles en este caso.')
      case 'unavailable': return setMessage('No se pudo comprobar esta posición. Revisa la definición del caso.')
      case 'correct': case 'incorrect': {
        const usage = { ...hintsUsed, reveal: hintsUsed.reveal + 1 }
        // Persist the spent use immediately, even if the player leaves straight after checking.
        saveCase(gameCase.id, { ...currentSave, hintsUsed: usage, positionChecksUsed: checked.positionChecksUsed })
        setPositionChecksUsed(checked.positionChecksUsed); setHintsUsed(usage); recordHintUse('reveal')
        setMessage(`La posición de ${selected?.name} ${checked.status === 'correct' ? 'es correcta' : 'no es correcta'}.`)
        return
      }
      default: { const exhaustive: never = checked.status; return exhaustive }
    }
  }
  const checkSolution = () => {
    if (placements.length < gameCase.characters.length) return setMessage('Debes colocar a todos los personajes.')
    if (!selectedKillerId) return setMessage('¿Quién crees que es el asesino?')
    if (!isSolutionCorrect(gameCase.solution, placements)) return setMessage('La investigación todavía tiene inconsistencias.')
    const found = findKiller(gameCase, placements)
    if (!found) return setMessage('Error interno: la solución no identifica un asesino coherente.')
    if (selectedKillerId !== found.id) return setMessage('La reconstrucción encaja, pero tu acusación no.')
    const performance = { review: hintsUsed.review, exclusion: hintsUsed.exclusion, positionChecks: positionChecksUsed }
    notifyCaseCompletionOnce(completionRecorded, performance, completedPerformance => {
      recordCaseCompletion(completionId ?? gameCase.id, recordGlobalCompletion)
      onCaseCompleted?.(completedPerformance)
    })
    setKiller(found); setResult(true)
  }
  const globalEvidence = gameCase.globalClues?.length ? <section className="global-evidence"><p className="eyebrow">EVIDENCIA GENERAL</p>{gameCase.globalClues.map(clue => <p key={clue.id}>{clue.text}</p>)}</section> : null
  const quickSelector = <>{globalEvidence}<div className="mobile-character-strip" aria-label="Selector rápido de personas"><p className="eyebrow">PERSONA ACTIVA</p><div>{gameCase.characters.map(character => { const descriptor = `${character.name}${character.roleLabel ? ` · ${character.roleLabel}` : ''}${character.isVictim ? ' · Víctima' : ''}`; return <button key={character.id} className={selectedId === character.id ? 'active' : ''} onClick={() => selectCharacter(character)} aria-pressed={selectedId === character.id} title={descriptor} aria-label={descriptor}><span><CharacterAvatar character={character} /></span><small>{character.name}</small>{character.isVictim && <i>V</i>}{placements.some(item => item.characterId === character.id) && <b>✓</b>}</button> })}</div></div></>

  return <main className="game-screen">
    <section className="game-case-header"><p className="eyebrow">{label}</p><h1>{gameCase.title}</h1><p className="intro">{gameCase.intro}</p><span className="case-classification">CLASIFICACIÓN · {formatDifficultyStars(gameCase.difficulty)}</span></section>
    <section className="investigation-brief"><div className="brief-title"><p className="eyebrow">FICHA DEL INCIDENTE</p><span>VÍCTIMA IDENTIFICADA</span></div><div className="victim-summary"><span>{victim && <CharacterAvatar character={victim} />}</span><div><strong>{victim?.name}</strong>{victim?.roleLabel && <em className="character-role">{victim.roleLabel}</em>}<small>VÍCTIMA</small></div></div><p>Reconstruye la escena con las declaraciones. El asesino es la única persona que estaba a solas con {victim?.name} en la misma habitación.</p></section>
    <div className="game-workspace"><aside className="suspect-panel"><div className="section-heading"><div><p className="eyebrow">PERSONAS PRESENTES</p><h2>Declaraciones</h2></div><span className="count">{placements.length}/{gameCase.characters.length} EN ESCENA</span></div><div className="characters">{gameCase.characters.map(character => <CharacterCard key={character.id} character={character} traitLabels={getCharacterTraitLabels(character, gameCase.traitDefinitions)} selected={selectedId === character.id} placed={placements.some(placement => placement.characterId === character.id)} onSelect={() => selectCharacter(character)}/>)}</div></aside>
      <section className="scene workspace-scene"><div className="section-heading"><div><p className="eyebrow">RECONSTRUCCIÓN</p><h2>Plano de la escena</h2></div><span className="hint desktop-hint">CLICK DERECHO · DESCARTE</span><span className="hint mobile-hint">USA MARCAR X · DESCARTE</span></div>{quickSelector}<div className="board-mode" aria-label={`Modo del tablero: ${interactionMode === 'place' ? 'colocar persona' : 'marcar descarte'}`}><span>MODO DEL TABLERO</span><button className={interactionMode === 'place' ? 'active' : ''} onClick={() => setInteractionMode('place')} aria-pressed={interactionMode === 'place'}>COLOCAR</button><button className={interactionMode === 'exclude' ? 'active' : ''} onClick={() => setInteractionMode('exclude')} aria-pressed={interactionMode === 'exclude'}>MARCAR X</button></div>
        <Board board={gameCase.board} rows={gameCase.rows} columns={gameCase.columns} zones={gameCase.zones} edgeFeatures={gameCase.edgeFeatures ?? []} placements={placements} excludedCells={excluded} manualExcludedCells={manualExcludedCells} characters={gameCase.characters} selectedCharacterId={selectedId} interactionMode={interactionMode} onCellClick={primaryBoardAction} onCellContextMenu={toggle}/>
        <div className="action-panel"><div className="active-character"><span className="active-label">FICHA ACTIVA</span><span className="active-avatar">{selected && <CharacterAvatar character={selected} />}</span><strong>{selected?.name ?? 'Ninguno'}</strong>{selected?.roleLabel && <em className="character-role">{selected.roleLabel}</em>}</div><div className="actions desktop-actions"><button onClick={remove}>Quitar</button><button onClick={undo}>↶ Deshacer</button><button className="action-danger" onClick={reset}>Reiniciar</button></div><p className="feedback" role="status">{message}</p><div className="actions checkpoint-entry"><button onClick={() => setCheckpointPanelOpen(true)}>PUNTOS DE GUARDADO <small>{checkpoints.length} GUARDADOS</small></button></div><div className="hint-actions"><p className="eyebrow">AYUDAS DE INVESTIGACIÓN</p><div className="actions"><button onClick={review}>Revisar investigación</button><button onClick={exclusion}>Pedir pista</button><button className="position-check-action" onClick={checkPosition} disabled={positionChecksRemaining === 0}>COMPROBAR POSICIÓN<small>{positionChecksRemaining} / {positionCheckLimit} disponibles</small></button></div></div><div className="killer-choice"><p className="eyebrow">ACUSACIÓN FINAL</p><h3>¿Quién es el asesino?</h3><div className="killer-options">{gameCase.characters.filter(character => !character.isVictim).map(character => <button key={character.id} className={selectedKillerId === character.id ? 'killer-selected' : ''} onClick={() => chooseKiller(character.id)} aria-pressed={selectedKillerId === character.id} title={character.roleLabel}><span><CharacterAvatar character={character} /></span><b>{character.name}</b>{selectedKillerId === character.id && <small>ACUSADO</small>}</button>)}</div></div><button className="primary check" onClick={checkSolution}>COMPROBAR SOLUCIÓN <span>→</span></button></div>
      </section>
    </div>
    <div className="mobile-game-toolbar"><button onClick={remove}>QUITAR</button><button onClick={undo}>↶ DESHACER</button><button className={interactionMode === 'place' ? 'active' : ''} onClick={() => setInteractionMode('place')} aria-pressed={interactionMode === 'place'}>COLOCAR</button><button className={interactionMode === 'exclude' ? 'active' : ''} onClick={() => setInteractionMode('exclude')} aria-pressed={interactionMode === 'exclude'}>MARCAR X</button></div><footer>Una historia original</footer>{result && killer && <ResultModal killer={killer} onClose={() => setResult(false)}/>}{checkpointPanelOpen && <CheckpointModal checkpoints={checkpoints} onCreate={saveCheckpoint} onRestore={restoreHypothesis} onDelete={id => setCheckpoints(items => deleteCheckpoint(items, id))} onClose={() => setCheckpointPanelOpen(false)} />}</main>
}

export function GameScreen(props: GameScreenProps) { return <GameSession key={props.gameCase.id} {...props}/> }
