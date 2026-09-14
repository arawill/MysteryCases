export interface CheckpointModalCallbacks {
  onCreate: (name: string, description: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export type CheckpointModalAction =
  | { type: 'create'; name: string; description: string }
  | { type: 'restore'; id: string }
  | { type: 'delete'; id: string }

export function executeCheckpointModalAction(
  action: CheckpointModalAction,
  callbacks: CheckpointModalCallbacks,
) {
  switch (action.type) {
    case 'create': callbacks.onCreate(action.name, action.description); return
    case 'restore': callbacks.onRestore(action.id); callbacks.onClose(); return
    case 'delete': callbacks.onDelete(action.id); return
    default: { const exhaustive: never = action; return exhaustive }
  }
}
