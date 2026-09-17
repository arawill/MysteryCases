# Caso 015 — Ensayo general

## Temática

Al terminar el ensayo, Clara aparece sin vida entre el atrezo del teatro. El plano distingue el escenario, el patio de butacas, los camerinos y el almacén de utilería. Las cortinas son un detalle de borde: ambientan el escenario, pero no alteran ninguna regla.

## Plano y zonas

- **Escenario:** la primera fila completa y las columnas 2–6 de la segunda fila.
- **Almacén:** la columna 1 y el bloque izquierdo de las filas 3–4.
- **Patio de butacas:** el bloque derecho de las filas 3–4.
- **Camerinos:** filas 5–6, columnas 2–6.

Cada zona es continua. Las etiquetas se sitúan en casillas libres de objetos y de la solución.

## Personas y solución canónica

| Persona | Papel | Posición |
| --- | --- | --- |
| Irene | Sospechosa | 1:2 |
| Mateo | Sospechoso y asesino | 2:1 |
| Nadia | Sospechosa | 3:6 |
| Clara | Víctima | 4:3 |
| Óliver | Sospechoso | 5:4 |
| Rocío | Sospechosa | 6:5 |

## Objetos, footprints y decoraciones

- **Piano** (`piano`): footprint horizontal 1:2–1:3. Solo 1:2 es ocupable para quien lo toca; 1:3 queda reservada. Se dibuja una única vez sobre las dos celdas y la persona queda por delante.
- **Butacas** (`cinemaSeatRow`): footprint horizontal 3:5–3:6. Solo 3:6 es ocupable; 3:5 queda reservada.
- **Tocador** (`dressingTable`): footprint horizontal bloqueante 5:5–5:6; ninguna celda es ocupable.
- **Foco** (`stageSpotlight`): 2:2, bloqueante, perfil `compact`.
- **Perchero** (`coatRack`): 6:6, bloqueante, perfil `tall`.
- **Cortina de escenario:** borde decorativo exterior sobre 1:4–1:5. No es un objeto de `board`, no recibe clics y no interviene en el solver.

## Pistas exactas

### Irene

- Estaba sentada al piano.
- Estaba junto al foco del escenario.

### Mateo

- Estaba sentado en el taburete del almacén.
- Estaba entre el atrezo guardado.

### Nadia

- Estaba sentada en el patio de butacas.
- Estaba frente al escenario.

### Óliver

- Estaba sentado en el camerino.
- Estaba junto al tocador.

### Rocío

- Estaba sentada en el camerino.
- Estaba junto al perchero.

### Clara

No tiene pistas. Se sitúa por descarte.

## Deducción paso a paso

1. El piano solo admite una persona en 1:2; Irene queda allí, junto al foco del escenario.
2. El taburete del almacén fija a Mateo en 2:1.
3. La única plaza habilitada de las butacas está en 3:6: es la posición de Nadia.
4. En los camerinos, el asiento contiguo al tocador es 5:4; Óliver ocupa esa casilla.
5. El asiento junto al perchero fija a Rocío en 6:5.
6. Las filas 1, 2, 3, 5 y 6 y las columnas 1, 2, 4, 5 y 6 ya están ocupadas. La única fila y columna restantes dejan a Clara en 4:3.

Las anclas de objeto, las reservas de footprint, las paredes de zona y la regla de una persona por fila y columna dejan una única solución. El solver termina sin truncamiento y coincide con la solución canónica.

## Víctima y asesino

Clara queda en el almacén, en 4:3. Mateo está en la única otra posición ocupada de esa misma zona, 2:1. No hay ninguna tercera persona allí, por lo que `findKiller()` identifica a Mateo como asesino.
