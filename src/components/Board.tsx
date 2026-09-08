import type { BoardCell, Character, Placement, Position, Zone } from '../game/types'
import { getCell } from '../game/rules'
import { fallbackZoneTheme, zoneTheme } from '../game/zones/theme'

interface BoardProps {
  board: BoardCell[]; rows: number; columns: number; zones: Zone[]; placements: Placement[]; excludedCells: Position[]; characters: Character[]; selectedCharacterId?: string | null
  onCellClick: (cell: BoardCell) => void; onCellContextMenu: (cell: BoardCell) => void
}

export function Board({ board, rows, columns, zones, placements, excludedCells, characters, selectedCharacterId, onCellClick, onCellContextMenu }: BoardProps) {
  const labels = Array.from({ length: rows }, (_, index) => index + 1)
  return <div className="board-wrap">
    <div className="board-plan-label"><span>PLANO DE LA ESCENA</span><small>{rows} × {columns} · COORDENADAS</small></div>
    <div className="board-frame">
      <div className="column-labels" style={{ '--columns': columns } as React.CSSProperties} aria-hidden="true"><span />{Array.from({ length: columns }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
      <div className="board-with-rows" style={{ '--rows': rows } as React.CSSProperties}>
        <div className="row-labels" aria-hidden="true">{labels.map(label => <span key={label}>{label}</span>)}</div>
        <div className="board" style={{ '--columns': columns, '--rows': rows } as React.CSSProperties}>
          {Array.from({ length: rows * columns }, (_, index) => {
            const cell = board[index]
            const person = placements.find(item => item.position.row === cell.row && item.position.column === cell.column)
            const character = person && characters.find(item => item.id === person.characterId)
            const excluded = excludedCells.some(item => item.row === cell.row && item.column === cell.column)
            const top = getCell(board, { row: cell.row - 1, column: cell.column })
            const left = getCell(board, { row: cell.row, column: cell.column - 1 })
            const zone = zones.find(item => item.id === cell.zoneId)
            const theme = zoneTheme[zone?.tone ?? cell.zoneId] ?? fallbackZoneTheme
            const first = board.find(item => item.zoneId === cell.zoneId)
            const firstZoneCell = first?.row === cell.row && first.column === cell.column
            const description = [`Fila ${cell.row}`, `columna ${cell.column}`, character?.name, excluded ? 'descartada' : '', cell.object?.label].filter(Boolean).join(', ')
            return <button key={`${cell.row}-${cell.column}`} style={{ '--zone-background': theme.background } as React.CSSProperties} className={`cell zone-themed ${!cell.occupiable ? 'blocked' : ''} ${excluded ? 'excluded' : ''} ${top && top.zoneId !== cell.zoneId ? 'wall-top' : ''} ${left && left.zoneId !== cell.zoneId ? 'wall-left' : ''}`} onClick={() => onCellClick(cell)} onContextMenu={event => { event.preventDefault(); onCellContextMenu(cell) }} aria-label={description}>
              <span className="object">{cell.object && <img src={cell.object.icon} alt="" />}</span>
              {firstZoneCell && zone?.icon && <img className="zone-marker" src={zone.icon} alt="" aria-hidden="true" />}
              {excluded && !character && <span className="exclude-mark" aria-hidden="true">×</span>}
              {character && <span className={`placed ${character.isVictim ? 'placed-victim' : ''} ${character.id === selectedCharacterId ? 'placed-selected' : ''}`}><b>{character.avatar}</b><i>{character.name}</i></span>}
            </button>
          })}
        </div>
      </div>
    </div>
    <div className="zone-legend" aria-label="Leyenda de zonas">{zones.map(zone => { const theme = zoneTheme[zone.tone] ?? fallbackZoneTheme; return <span key={zone.id}><b className="dot" style={{ background: theme.dot }} />{zone.name}</span> })}</div>
  </div>
}
