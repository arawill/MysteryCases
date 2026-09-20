# D2/C02 — Protocolo Quimera

## Temática y plano

Laboratorio futurista de 7×7. El plano reparte Ensayos y Cápsulas en las filas 1–3; Análisis, Limpieza y Archivo en las filas 4–5; y Control en las filas 6–7.

Objetos: mesa de laboratorio bloqueante en 1:1–1:2; acuario de laboratorio bloqueante en 1:5–1:6; cápsula de cristal bloqueante en 2:7; máquina de análisis bloqueante en 4:2; y arco de limpieza bloqueante en 4:4.

## Personajes y solución canónica

| Personaje | Posición | Pistas |
| --- | --- | --- |
| Claudia | 1:4 | Estaba en la primera fila. Estaba en la sala de ensayos. No estaba junto a la mesa de laboratorio. |
| Héctor | 2:6 | Estaba junto al acuario de laboratorio. Estaba en la sexta columna. |
| Miriam | 3:1 | Estaba en la tercera fila. Estaba en la primera columna. |
| Gabriel | 4:5 | Estaba en la cuarta fila. Estaba en el archivo. |
| Alicia | 5:3 | Estaba al sureste de la máquina de análisis. |
| Diego | 6:7 | Estaba en la sexta fila. Estaba en la misma columna que la cápsula de cristal. |
| Eva (víctima) | 7:2 | Sin pistas. |

Diego es el asesino: es la única persona que comparte Control con Eva.

## Deducción

Claudia queda en 1:4: las otras celdas libres de la primera fila de Ensayos están junto a la mesa de laboratorio. Héctor queda en 2:6 porque es la única posición de la sexta columna junto al acuario de laboratorio. Miriam queda en 3:1 al cruzar la tercera fila con la primera columna.

Alicia queda en 5:3, la única posición al sureste de la máquina dentro de Análisis. Diego queda en 6:7 al cruzar la sexta fila con la columna de la cápsula de cristal. Gabriel queda en 4:5 por su fila, Archivo y las columnas ya utilizadas. Por descarte, Eva queda en 7:2.

La solución usa exactamente una persona por cada fila y columna. En Control solo quedan Diego y Eva, por lo que `findKiller()` identifica a Diego sin ambigüedad.
