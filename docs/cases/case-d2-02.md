# D2/C02 — Protocolo Quimera

## Temática y plano

Laboratorio futurista de xenobiología de 7×7. El plano reparte Laboratorio principal y Sala de contención en las filas 1–3; Área de análisis, Descontaminación y Archivo biológico en las filas 4–5; y Observación en las filas 6–7.

Objetos: mesa de xenobiología bloqueante en 1:1–1:2; tanque de espécimen bloqueante en 1:5–1:6; cápsula de contención bloqueante en 2:7; analizador de muestras bloqueante en 4:2; y arco de descontaminación bloqueante en 4:4.

## Personajes y solución canónica

| Personaje | Posición | Pistas |
| --- | --- | --- |
| Claudia | 1:4 | Estaba en la primera fila. Estaba en el laboratorio principal. No estaba junto a la mesa de xenobiología. |
| Héctor | 2:6 | Estaba junto al tanque de espécimen. Estaba en la sexta columna. |
| Miriam | 3:1 | Estaba en la tercera fila. Estaba en una esquina de su zona. |
| Gabriel | 4:5 | Estaba en la cuarta fila. Estaba en el archivo biológico. |
| Alicia | 5:3 | Estaba al sureste del analizador de muestras. |
| Diego | 6:7 | Estaba en la sexta fila. Estaba en la misma columna que la cápsula de contención. |
| Eva (víctima) | 7:2 | Sin pistas. |

Diego es el asesino: es la única persona que comparte Observación con Eva.

## Deducción

Claudia queda en 1:4: las otras celdas libres de la primera fila del laboratorio están junto a la mesa. Héctor queda en 2:6 porque es la única posición de la sexta columna junto al tanque. Miriam queda en 3:1; la otra esquina posible de su fila usa la columna ya asignada a Claudia.

Alicia queda en 5:3, la única posición al sureste del analizador dentro del Área de análisis. Diego queda en 6:7 al cruzar la sexta fila con la columna de la cápsula de contención. Gabriel queda en 4:5 por su fila, Archivo biológico y las columnas ya utilizadas. Por descarte, Eva queda en 7:2.

La solución usa exactamente una persona por cada fila y columna. En Observación solo quedan Diego y Eva, por lo que `findKiller()` identifica a Diego sin ambigüedad.
