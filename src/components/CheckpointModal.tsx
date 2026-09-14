import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CHECKPOINT_DESCRIPTION_LIMIT, CHECKPOINT_LIMIT_MESSAGE, CHECKPOINT_NAME_LIMIT, MAX_CHECKPOINTS_PER_CASE, type CaseCheckpoint } from '../game/checkpoints'
import { executeCheckpointModalAction, type CheckpointModalCallbacks } from './checkpointModalActions'
import '../styles/checkpoints.css'

interface CheckpointModalProps extends CheckpointModalCallbacks {
  checkpoints: CaseCheckpoint[]
}

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' })

export function CheckpointModal({ checkpoints, onCreate, onRestore, onDelete, onClose }: CheckpointModalProps) {
  const dialog = useRef<HTMLDialogElement>(null), nameInput = useRef<HTMLInputElement>(null), confirmationButton = useRef<HTMLButtonElement>(null)
  const [name, setName] = useState(''), [description, setDescription] = useState('')
  const [feedback, setFeedback] = useState('')
  const [pending, setPending] = useState<{ action: 'restore' | 'delete'; id: string } | null>(null)
  const ordered = useMemo(() => [...checkpoints].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [checkpoints])
  const limitReached = checkpoints.length >= MAX_CHECKPOINTS_PER_CASE
  const callbacks = { onCreate, onRestore, onDelete, onClose }

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    nameInput.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => { confirmationButton.current?.focus() }, [pending])

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      executeCheckpointModalAction({ type: 'create', name, description }, callbacks)
      setName(''); setDescription(''); setFeedback('Punto de guardado creado.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'No se pudo crear el punto de guardado.') }
  }

  const confirm = () => {
    if (!pending) return
    if (pending.action === 'restore') {
      executeCheckpointModalAction({ type: 'restore', id: pending.id }, callbacks)
      return
    }
    executeCheckpointModalAction({ type: 'delete', id: pending.id }, callbacks)
    setFeedback('Punto de guardado eliminado.')
    setPending(null)
    nameInput.current?.focus()
  }

  return <dialog ref={dialog} className="checkpoint-dialog" aria-labelledby="checkpoint-title" aria-describedby="checkpoint-description" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="checkpoint-header"><div><p className="eyebrow">HIPÓTESIS DE INVESTIGACIÓN</p><h2 id="checkpoint-title">Puntos de guardado</h2></div><button type="button" onClick={onClose} aria-label="Cerrar puntos de guardado">✕</button></div>
    <p id="checkpoint-description">Conserva una hipótesis para volver a ella. Restaurarla no recupera ayudas ni comprobaciones gastadas.</p>
    <p className="checkpoint-counter"><strong>{checkpoints.length} / {MAX_CHECKPOINTS_PER_CASE} GUARDADOS</strong>{limitReached && <span>{CHECKPOINT_LIMIT_MESSAGE}</span>}</p>
    <form className="checkpoint-form" onSubmit={create}>
      <label htmlFor="checkpoint-name">Nombre <small>{name.length} / {CHECKPOINT_NAME_LIMIT}</small></label>
      <input ref={nameInput} id="checkpoint-name" value={name} onChange={event => setName(event.target.value)} maxLength={CHECKPOINT_NAME_LIMIT} required placeholder="Primera hipótesis" />
      <label htmlFor="checkpoint-notes">Descripción <span>(opcional)</span> <small>{description.length} / {CHECKPOINT_DESCRIPTION_LIMIT}</small></label>
      <textarea id="checkpoint-notes" value={description} onChange={event => setDescription(event.target.value)} maxLength={CHECKPOINT_DESCRIPTION_LIMIT} rows={2} />
      <button className="primary" type="submit" disabled={!name.trim() || limitReached}>CREAR PUNTO DE GUARDADO</button>
    </form>
    <p className="checkpoint-feedback" role="status">{feedback}</p>
    <ul className="checkpoint-list" aria-label="Hipótesis guardadas">{ordered.map(checkpoint => <li key={checkpoint.id}>
      <h3>{checkpoint.name}</h3>{checkpoint.description && <p>{checkpoint.description}</p>}
      <div className="checkpoint-meta"><time dateTime={checkpoint.createdAt}>{dateFormat.format(new Date(checkpoint.createdAt))}</time><span>{checkpoint.placements.length} PERSONAS EN ESCENA</span></div>
      <div className="actions"><button type="button" onClick={() => setPending({ action: 'restore', id: checkpoint.id })}>RESTAURAR</button><button type="button" className="action-danger" onClick={() => setPending({ action: 'delete', id: checkpoint.id })}>ELIMINAR</button></div>
      {pending?.id === checkpoint.id && <div className="checkpoint-confirmation" role="alert"><p>{pending.action === 'restore' ? '¿Restaurar este punto de guardado? El estado actual del tablero será sustituido.' : '¿Eliminar este punto de guardado? No podrás recuperarlo.'}</p><div className="actions"><button ref={confirmationButton} type="button" onClick={confirm}>{pending.action === 'restore' ? 'CONFIRMAR RESTAURACIÓN' : 'CONFIRMAR ELIMINACIÓN'}</button><button type="button" onClick={() => setPending(null)}>CANCELAR</button></div></div>}
    </li>)}</ul>
    {!ordered.length && <p className="checkpoint-empty">Todavía no has guardado ninguna hipótesis de este caso.</p>}
  </dialog>
}
