# Caso 014 — Después del cierre

## Temática

Noa fue encontrada sin vida cuando el museo cerraba. El plano reúne el vestíbulo, una galería de exposición, el almacén y el área de restauración. Los cuadros de la galería se representan como detalles de pared: ayudan a reconocer el escenario, pero no son casillas ni objetos lógicos.

## Plano y zonas

- **Vestíbulo:** fila 1, columnas 1–3.
- **Galería:** sector superior derecho y pasillo derecho de las filas 2–3.
- **Almacén:** columnas 1–3 desde la fila 2.
- **Restauración:** bloque inferior derecho, filas 4–6 y columnas 4–6.

Las cuatro zonas son continuas y sus etiquetas están en casillas libres, sin objetos ni personas de la solución.

## Personas y solución canónica

| Persona | Papel | Posición |
| --- | --- | --- |
| Amelia | Sospechosa | 1:2 |
| Héctor | Sospechoso y asesino | 2:1 |
| Simón | Sospechoso | 3:6 |
| Noa | Víctima | 4:3 |
| Iria | Sospechosa | 5:4 |
| Gael | Sospechoso | 6:5 |

## Objetos y decoraciones

- **Vitrina** (`displayCase`): footprint horizontal bloqueante en 3:4–3:5. Se renderiza como una imagen única; ambas celdas no son ocupables y 3:5 queda reservada.
- **Mesa de restauración** (`restorationTable`): footprint horizontal bloqueante en 5:5–5:6. Se renderiza una sola vez y la celda 5:6 queda reservada.
- **Estatua:** objeto bloqueante en 6:6, junto al asiento de Gael.
- **Cuadros de la galería:** dos decoraciones de borde exterior, en el norte de 1:5 y el este de 2:6. No aparecen en `board.object`, no modifican la ocupación y no intervienen en el solver.
- Los asientos de 1:2, 2:1, 3:6, 5:4 y 6:5 son los apoyos ocupables de los sospechosos.

## Pistas exactas

### Amelia

- Estaba sentada en el vestíbulo.
- Estaba junto a la entrada del museo.

### Héctor

- Estaba sentado en el taburete del almacén.
- Estaba en el almacén.

### Simón

- Estaba sentado en la galería.
- Estaba junto a la vitrina.

### Iria

- Estaba sentada en restauración.
- Estaba junto a la mesa de restauración.

### Gael

- Estaba sentado en la sala de restauración.
- Estaba junto a la estatua.

### Noa

No tiene pistas. Su posición se deduce por descarte.

## Deducción paso a paso

1. El asiento del vestíbulo solo está en 1:2; Amelia queda fijada allí.
2. El taburete del almacén fija a Héctor en 2:1.
3. El asiento de galería junto a la vitrina es 3:6; Simón ocupa esa posición.
4. En restauración, el único asiento junto a la mesa de restauración es 5:4, así que Iria va allí.
5. El asiento junto a la estatua fija a Gael en 6:5.
6. Ya están ocupadas las filas 1, 2, 3, 5 y 6, así como las columnas 1, 2, 4, 5 y 6. Por descarte, Noa ocupa 4:3.

Las anclas de objetos, las paredes entre zonas y la regla de una persona por fila y columna eliminan cualquier alternativa. El solver encuentra una única solución, no se trunca y coincide con la canónica.

## Víctima y asesino

Noa queda en el almacén, en 4:3. Héctor está en la única otra posición ocupada de esa zona, 2:1. Ningún otro personaje comparte el almacén: por tanto, `findKiller()` devuelve a Héctor.
