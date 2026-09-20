# D2/C04 — La cosecha de Marte

## Temática y plano

Una instalación agrícola futurista de 7×7 en Marte. Riego ocupa las filas 1–2 y columnas 1–3; Vivero, las filas 1–2 y columnas 4–7; Cultivo, las filas 3–4 y columnas 1–4; Depósito, las filas 3–4 y columnas 5–7; Almacén, las filas 5–7 y columnas 1–3; y Control, las filas 5–7 y columnas 4–7. El borde norte del Vivero tiene el `Ventanal a Marte`, un elemento visual que no ocupa casillas.

Los cinco objetos exclusivos son la máquina de riego bloqueante en 1:1–1:2, el bancal de plantas bloqueante en 3:2–3:3, el depósito cilíndrico bloqueante en 3:7, la torre de plantas bloqueante en 4:2 y el carro con plantas bloqueante en 6:2. Los dos objetos horizontales usan una única imagen sobre su footprint 1×2.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Elena | 1:4 | Vivero | Estaba en la cuarta columna. / Estaba al norte de Aitana. |
| Hugo | 2:2 | Riego | Estaba en la misma columna que la máquina de riego. |
| Aitana | 3:6 | Depósito | Estaba en el depósito. / Estaba junto al depósito cilíndrico. |
| Rubén | 4:1 | Cultivo | Estaba en cultivo. / Estaba al suroeste de la máquina de riego. |
| Joel | 5:7 | Control | Estaba en la misma columna que el depósito cilíndrico. / Estaba al norte de Iris. |
| Marta | 6:3 | Almacén | Estaba en el almacén. / Estaba junto al carro con plantas. |
| Iris (víctima) | 7:5 | Control | Sin pistas. |

Joel es el asesino: es la única persona que comparte Control con Iris.

## Deducción

Elena está en la cuarta columna y al norte de Aitana. Hugo comparte una de las columnas de la máquina de riego. Aitana queda en el Depósito junto al depósito cilíndrico; Rubén está en Cultivo, al suroeste de la máquina de riego.

Joel comparte columna con el depósito cilíndrico y queda al norte de Iris. Marta está junto al carro con plantas en el Almacén. La regla de una persona por fila y columna completa las posiciones y deja a Iris en 7:5 por descarte.

La solución usa exactamente una persona en cada fila y columna y deja al menos una persona en cada zona. Solo Joel acompaña a Iris en Control, por lo que `findKiller()` devuelve a Joel.
