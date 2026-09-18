# D2/C04 — La cosecha de Marte

## Temática y plano

Una instalación agrícola futurista de 7×7 en Marte. Riego ocupa las filas 1–2 y columnas 1–3; Vivero, las filas 1–2 y columnas 4–7; Cultivo, las filas 3–4 y columnas 1–4; Depósito, las filas 3–4 y columnas 5–7; Almacén, las filas 5–7 y columnas 1–3; y Control, las filas 5–7 y columnas 4–7. El borde norte del Vivero tiene el `Ventanal a Marte`, un elemento visual que no ocupa casillas.

Los cinco objetos exclusivos son la consola de riego bloqueante en 1:1–1:2, el cultivo de plantas bloqueante en 3:2–3:3, el depósito de agua bloqueante en 3:7, la torre de cultivo bloqueante en 4:2 y el carro de cosecha bloqueante en 6:2. Los dos objetos horizontales usan una única imagen sobre su footprint 1×2.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Elena | 1:4 | Vivero | Estaba en el vivero. / Estaba en la cuarta columna. |
| Hugo | 2:2 | Riego | Estaba en la segunda fila. / Estaba al sureste de la consola de riego. |
| Aitana | 3:6 | Depósito | Estaba en la tercera fila. / Estaba junto al depósito de agua. |
| Rubén | 4:1 | Cultivo | Estaba en la cuarta fila. / Estaba junto a la torre de cultivo. / Estaba en una esquina del cultivo. |
| Joel | 5:7 | Control | Estaba en la quinta fila. / Estaba en la séptima columna. |
| Marta | 6:3 | Almacén | Estaba en la sexta fila. / Estaba junto al carro de cosecha. |
| Iris (víctima) | 7:5 | Control | Sin pistas. |

Joel es el asesino: es la única persona que comparte Control con Iris.

## Deducción

Elena queda en 1:4 al cruzar Vivero con la cuarta columna. Aitana queda en 3:6 por su fila y el depósito de agua. Joel queda en 5:7 por fila y columna.

Rubén está en la cuarta fila junto a la torre de cultivo; de esas posiciones, solo 4:1 es una esquina del Cultivo. Marta queda en 6:3: en la sexta fila, la otra posición junto al carro usa la primera columna de Rubén. Hugo queda en 2:2, al sureste de la consola de riego y con la tercera columna ya tomada por Marta. Por descarte de fila y columna, Iris queda en 7:5.

La solución usa exactamente una persona en cada fila y columna. Solo Joel acompaña a Iris en Control, por lo que `findKiller()` devuelve a Joel.
