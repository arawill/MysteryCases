# D2/C04 — La cosecha de Marte

## Temática y plano

Una instalación agrícola futurista de 7×7 en Marte. Riego ocupa las filas 1–2 y columnas 1–3; Vivero, las filas 1–2 y columnas 4–7; Cultivo, las filas 3–4 y columnas 1–4; Depósito, las filas 3–4 y columnas 5–7; Almacén, las filas 5–7 y columnas 1–3; y Control, las filas 5–7 y columnas 4–7. El borde norte del Vivero tiene el `Ventanal a Marte`, un elemento visual que no ocupa casillas.

Los cinco objetos exclusivos son la máquina de riego bloqueante en 1:1–1:2, el bancal de plantas bloqueante en 3:2–3:3, el depósito cilíndrico bloqueante en 3:7, la torre de plantas bloqueante en 4:2 y el carro con plantas bloqueante en 6:2. Los dos objetos horizontales usan una única imagen sobre su footprint 1×2.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Elena | 1:4 | Vivero | Estaba en el vivero. / Estaba en la cuarta columna. |
| Hugo | 2:2 | Riego | Estaba en la segunda fila. / Estaba en la segunda columna. |
| Aitana | 3:6 | Depósito | Estaba en la tercera fila. / Estaba junto al depósito cilíndrico. |
| Rubén | 4:1 | Cultivo | Estaba en la cuarta fila. / Estaba en la primera columna. |
| Joel | 5:7 | Control | Estaba en la quinta fila. / Estaba en la séptima columna. |
| Marta | 6:3 | Almacén | Estaba en la sexta fila. / Estaba en la tercera columna. |
| Iris (víctima) | 7:5 | Control | Sin pistas. |

Joel es el asesino: es la única persona que comparte Control con Iris.

## Deducción

Elena queda en 1:4 al cruzar Vivero con la cuarta columna. Aitana queda en 3:6 por su fila y el depósito cilíndrico. Joel queda en 5:7 por fila y columna.

Rubén queda en 4:1 al cruzar la cuarta fila con la primera columna. Marta queda en 6:3 al cruzar la sexta fila con la tercera columna. Hugo queda en 2:2 por su fila y columna. Por descarte de fila y columna, Iris queda en 7:5.

La solución usa exactamente una persona en cada fila y columna y deja al menos una persona en cada zona. Solo Joel acompaña a Iris en Control, por lo que `findKiller()` devuelve a Joel.
