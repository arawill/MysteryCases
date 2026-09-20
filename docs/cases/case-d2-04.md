# D2/C04 — La cosecha de Marte

## Temática y plano

Una instalación agrícola futurista de 7×7 en Marte. Riego ocupa las filas 1–2 y columnas 1–3; Vivero, las filas 1–2 y columnas 4–7; Cultivo, las filas 3–4 y columnas 1–4; Depósito, las filas 3–4 y columnas 5–7; Almacén, las filas 5–7 y columnas 1–3; y Control, las filas 5–7 y columnas 4–7. El borde norte del Vivero tiene el `Ventanal a Marte`, un elemento visual que no ocupa casillas.

Los cinco objetos exclusivos son la máquina de riego bloqueante en 1:1–1:2, el bancal de plantas bloqueante en 3:2–3:3, el depósito cilíndrico bloqueante en 3:7, la torre de plantas bloqueante en 4:2 y el carro con plantas bloqueante en 6:2. Los dos objetos horizontales usan una única imagen sobre su footprint 1×2.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Elena | 1:4 | Vivero | Estaba en la cuarta columna. / Estaba dos filas al norte de Aitana. |
| Hugo | 2:2 | Riego | Estaba en la segunda columna. / Estaba una fila al sur de Elena. |
| Aitana | 3:6 | Depósito | Estaba en la sexta columna. / Estaba al norte de Iris. |
| Rubén | 4:1 | Cultivo | Estaba en la primera columna. / Estaba una fila al norte de Joel. |
| Joel | 5:7 | Control | Estaba en la séptima columna. / Estaba dos filas al norte de Iris. |
| Marta | 6:3 | Almacén | Estaba en la tercera columna. / Estaba una fila al norte de Iris. |
| Iris (víctima) | 7:5 | Control | Sin pistas. |

Joel es el asesino: es la única persona que comparte Control con Iris.

## Deducción

Las columnas sitúan a Elena, Hugo, Aitana, Rubén, Joel y Marta sin entregar sus filas. Elena queda dos filas al norte de Aitana; Hugo está una fila al sur de Elena.

Rubén queda una fila al norte de Joel. Joel está dos filas al norte de Iris y Marta una fila al norte de Iris. Al cruzar estas relaciones con las columnas y la regla de una persona por fila y columna, Iris queda en 7:5 por descarte.

La solución usa exactamente una persona en cada fila y columna y deja al menos una persona en cada zona. Solo Joel acompaña a Iris en Control, por lo que `findKiller()` devuelve a Joel.
