import { useEffect, useMemo, useRef, useState } from 'react'
import { Board } from '../components/Board'
import { CharacterCard } from '../components/CharacterCard'
import { ResultModal } from '../components/ResultModal'
import { formatDifficultyStars } from '../game/difficulty'
import { getAutomaticExcludedCells, mergeExcludedCells, positionKey } from '../game/exclusions'
import { getExclusionHint, getRevealHint, reviewInvestigation } from '../game/hints'
import { recordCaseCompletion } from '../game/persistence/completion'
import { loadCaseSave, saveCase } from '../game/persistence/caseSave'
import { loadSettings } from '../game/persistence/settings'
import { canPlace, findKiller, isSolutionCorrect } from '../game/rules'
import type { BoardCell, Character, GameCase, Placement, Position } from '../game/types'

interface GameScreenProps {
  gameCase: GameCase
  eyebrowLabel?: string
  onCompletionAcknowledged?: () => void
  onCaseCompleted?: () => void
  recordGlobalCompletion?: boolean
  completionId?: string
}

function GameSession({
  gameCase,
  eyebrowLabel,
  onCompletionAcknowledged,
  onCaseCompleted,
  recordGlobalCompletion = true,
  completionId,
}: GameScreenProps) {
  const initial = useMemo(() => loadCaseSave(gameCase.id), [gameCase.id])
  const [placements, setPlacements] = useState<Placement[]>(initial.placements)
  const [manualExcludedCells, setManualExcludedCells] = useState<Position[]>(initial.manualExcludedCells)
  const [hintsUsed, setHintsUsed] = useState(initial.hintsUsed)
  const [selectedId, setSelectedId] = useState<string | null>(gameCase.characters[0]?.id ?? null)
  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null)
  const [message, setMessage] = useState('Elige una persona y toca una celda del escenario.')
  const [history, setHistory] = useState<Placement[][]>([])
  const [killer, setKiller] = useState<Character | null>(null)
  const [result, setResult] = useState(false)
  const shown = useRef(false)
  const victim = gameCase.characters.find(character => character.isVictim)
  const selected = gameCase.characters.find(character => character.id === selectedId)
  const auto = loadSettings().autoCrossout
  const automatic = useMemo(() => getAutomaticExcludedCells(gameCase.board, placements), [gameCase.board, placements])
  const excluded = useMemo(
    () => mergeExcludedCells(manualExcludedCells, auto ? automatic : []),
    [manualExcludedCells, automatic, auto],
  )
  const label = eyebrowLabel ?? `${gameCase.id.toUpperCase()} · DEDUCCIÓN ESPACIAL`

  useEffect(() => {
    saveCase(gameCase.id, { placements, manualExcludedCells, hintsUsed })
  }, [gameCase.id, placements, manualExcludedCells, hintsUsed])

  useEffect(() => {
    if (result) shown.current = true
    else if (shown.current) {
      shown.current = false
      onCompletionAcknowledged?.()
    }
  }, [result, onCompletionAcknowledged])

  const place = (cell: BoardCell) => {
    if (!selectedId) return setMessage('Selecciona primero una persona.')
    const check = canPlace(selectedId, cell, placements, gameCase.board)
    if (!check.ok) return setMessage(check.reason)
    setHistory(items => [...items, placements])
    setPlacements(items => [
      ...items.filter(item => item.characterId !== selectedId),
      { characterId: selectedId, position: { row: cell.row, column: cell.column } },
    ])
    setManualExcludedCells(items => items.filter(item => positionKey(item) !== positionKey(cell)))
    setMessage(`${selected?.name} ocupa la fila ${cell.row}, columna ${cell.column}.`)
  }

  const toggle = (cell: BoardCell) => {
    const occupied = placements.some(placement => positionKey(placement.position) === positionKey(cell))
    if (!cell.occupiable || occupied) return
    const automaticallyExcluded = automatic.some(position => positionKey(position) === positionKey(cell))
    const manuallyExcluded = manualExcludedCells.some(position => positionKey(position) === positionKey(cell))
    if (auto && automaticallyExcluded && !manuallyExcluded) {
      return setMessage('Esta casilla está descartada automáticamente.')
    }
    setManualExcludedCells(items => manuallyExcluded
      ? items.filter(item => positionKey(item) !== positionKey(cell))
      : [...items, { row: cell.row, column: cell.column }])
    setMessage('Anotación de descarte actualizada.')
  }

  const remove = () => {
    if (!selectedId || !placements.some(placement => placement.characterId === selectedId)) {
      return setMessage('Selecciona una persona que esté en escena.')
    }
    setHistory(items => [...items, placements])
    setPlacements(items => items.filter(item => item.characterId !== selectedId))
    setMessage('Persona retirada del tablero.')
  }

  const undo = () => {
    const last = history.at(-1)
    if (!last) return setMessage('No hay movimientos que deshacer.')
    setPlacements(last)
    setHistory(items => items.slice(0, -1))
    setMessage('Último movimiento deshecho.')
  }

  const reset = () => {
    if (!window.confirm('¿Reiniciar la investigación y quitar todas las personas y descartes?')) return
    setHistory(items => [...items, placements])
    setPlacements([])
    setManualExcludedCells([])
    setMessage('La escena está despejada.')
  }

  const chooseKiller = (id: string) => {
    setSelectedKillerId(id)
    const character = gameCase.characters.find(item => item.id === id)
    if (character) setMessage(`${character.name} señalado/a como sospechoso/a.`)
  }

  const review = () => {
    const hint = reviewInvestigation(gameCase, placements)
    setHintsUsed(value => ({ ...value, review: value.review + 1 }))
    const name = hint.status === 'contradiction'
      ? gameCase.characters.find(character => character.id === hint.characterId)?.name
      : null
    setMessage(name
      ? `Hay una contradicción en las pistas de ${name}.`
      : 'No veo contradicciones directas. Eso no garantiza la solución final.')
  }

  const exclusion = () => {
    const hint = getExclusionHint(gameCase, placements, manualExcludedCells)
    if (!hint) return setMessage('No encuentro una exclusión nueva útil.')
    setHintsUsed(value => ({ ...value, exclusion: value.exclusion + 1 }))
    const name = gameCase.characters.find(character => character.id === hint.characterId)?.name
    setMessage(`Puedes descartar fila ${hint.position.row}, columna ${hint.position.column} para ${name}.`)
  }

  const reveal = () => {
    if (!window.confirm('Esta ayuda revelará la posición exacta de un personaje. ¿Continuar?')) return
    const hint = getRevealHint(gameCase, placements, selectedId)
    if (!hint) return setMessage('Todas las posiciones ya son correctas.')
    setHintsUsed(value => ({ ...value, reveal: value.reveal + 1 }))
    const name = gameCase.characters.find(character => character.id === hint.characterId)?.name
    setMessage(`${name} estaba en fila ${hint.position.row}, columna ${hint.position.column}.`)
  }

  const checkSolution = () => {
    if (placements.length < gameCase.characters.length) return setMessage('Debes colocar a todos los personajes.')
    if (!selectedKillerId) return setMessage('¿Quién crees que es el asesino?')
    if (!isSolutionCorrect(gameCase.solution, placements)) return setMessage('La investigación todavía tiene inconsistencias.')
    const found = findKiller(gameCase, placements)
    if (!found) return setMessage('Error interno: la solución no identifica un asesino coherente.')
    if (selectedKillerId !== found.id) return setMessage('La reconstrucción encaja, pero tu acusación no.')
    recordCaseCompletion(completionId ?? gameCase.id, recordGlobalCompletion)
    onCaseCompleted?.()
    setKiller(found)
    setResult(true)
  }

  return <main>
    <section className="hero">
      <div>
        <p className="eyebrow">{label}</p>
        <h1>{gameCase.title}</h1>
        <p className="intro">{gameCase.intro}</p>
        <span className="difficulty" aria-label={`Dificultad ${gameCase.difficulty} de 5 estrellas`}>
          ✦ Dificultad: {formatDifficultyStars(gameCase.difficulty)}
        </span>
      </div>
      <div className="coffee-seal">☕</div>
    </section>

    <section className="investigation-brief">
      <p className="eyebrow">OBJETIVO DE LA INVESTIGACIÓN</p>
      <div className="victim-summary">
        <span>{victim?.avatar}</span>
        <div><strong>Víctima: {victim?.name}</strong><small>VÍCTIMA</small></div>
      </div>
      <p>Utiliza las pistas para reconstruir la escena.</p>
      <p>El asesino es la única persona que estaba a solas con {victim?.name} en la misma habitación.</p>
    </section>

    <section>
      <div className="section-heading">
        <div><p className="eyebrow">LAS PERSONAS PRESENTES</p><h2>Sospechosos</h2></div>
        <span className="count">{placements.length}/{gameCase.characters.length} colocados</span>
      </div>
      <div className="characters">
        {gameCase.characters.map(character => <CharacterCard
          key={character.id}
          character={character}
          selected={selectedId === character.id}
          placed={placements.some(placement => placement.characterId === character.id)}
          onSelect={() => { setSelectedId(character.id); setMessage(`${character.name} seleccionado/a. Ahora toca una celda.`) }}
        />)}
      </div>
    </section>

    <section className="scene">
      <div className="section-heading">
        <div><p className="eyebrow">RECONSTRUCCIÓN</p><h2>Escena del crimen</h2></div>
        <span className="hint">Click derecho: marcar descarte</span>
      </div>
      <Board
        board={gameCase.board}
        rows={gameCase.rows}
        columns={gameCase.columns}
        zones={gameCase.zones}
        placements={placements}
        excludedCells={excluded}
        characters={gameCase.characters}
        onCellClick={place}
        onCellContextMenu={toggle}
      />
      <div className="action-panel">
        <p><span className="selected-dot" /> Personaje seleccionado: <strong>{selected?.name ?? 'ninguno'}</strong></p>
        <div className="actions">
          <button onClick={remove}>Quitar</button>
          <button onClick={undo}>↶ Deshacer</button>
          <button onClick={reset}>Reiniciar</button>
        </div>
        <p className="feedback" role="status">{message}</p>

        <div className="hint-actions">
          <p className="eyebrow">AYUDAS DE INVESTIGACIÓN</p>
          <div className="actions">
            <button onClick={review}>Revisar investigación</button>
            <button onClick={exclusion}>Pedir pista</button>
            <button onClick={reveal}>Revelar posición</button>
          </div>
        </div>

        <div className="killer-choice">
          <p className="eyebrow">¿QUIÉN ES EL ASESINO?</p>
          <div className="killer-options">
            {gameCase.characters.filter(character => !character.isVictim).map(character => <button
              key={character.id}
              className={selectedKillerId === character.id ? 'killer-selected' : ''}
              onClick={() => chooseKiller(character.id)}
              aria-pressed={selectedKillerId === character.id}
            ><span>{character.avatar}</span>{character.name}</button>)}
          </div>
        </div>
        <button className="primary check" onClick={checkSolution}>Comprobar solución <span>→</span></button>
      </div>
    </section>
    <footer>Una historia original</footer>
    {result && killer && <ResultModal killer={killer} onClose={() => setResult(false)} />}
  </main>
}

export function GameScreen(props: GameScreenProps) {
  return <GameSession key={props.gameCase.id} {...props} />
}
