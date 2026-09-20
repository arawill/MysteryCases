# D2/C02 — Protocolo Quimera

## Temática y plano

Laboratorio futurista de 7×7. El plano reparte Ensayos y Cápsulas en las filas 1–3; Limpieza forma una columna continua en 3:4–5:4; Análisis y Archivo ocupan las filas 4–5; y Control, las filas 6–7.

Objetos: mesa de laboratorio bloqueante en 1:1–1:2; acuario de laboratorio bloqueante en 1:5–1:6; cápsula de cristal bloqueante en 2:7; máquina de análisis bloqueante en 4:2; y arco de limpieza bloqueante en 4:4.

## Personajes y solución canónica

| Personaje | Posición | Pistas |
| --- | --- | --- |
| Claudia | 1:3 | Estaba en la primera fila. Estaba en la tercera columna. |
| Héctor | 2:6 | Estaba junto al acuario de laboratorio. Estaba en la sexta columna. |
| Miriam | 3:4 | Estaba en la tercera fila. Estaba en la zona de limpieza. |
| Gabriel | 4:5 | Estaba en la cuarta fila. Estaba en el archivo. |
| Alicia | 5:1 | Estaba en la quinta fila. Estaba en la primera columna. |
| Diego | 6:7 | Estaba en la sexta fila. Estaba en la séptima columna. |
| Eva (víctima) | 7:2 | Sin pistas. |

Diego es el asesino: es la única persona que comparte Control con Eva.

## Deducción

Claudia queda en 1:3 al cruzar la primera fila con la tercera columna. Héctor queda en 2:6 porque es la única posición de la sexta columna junto al acuario de laboratorio. Miriam queda en 3:4 al cruzar la tercera fila con la zona de Limpieza.

Alicia queda en 5:1 al cruzar la quinta fila con la primera columna. Diego queda en 6:7 al cruzar la sexta fila con la séptima columna. Gabriel queda en 4:5 por su fila, Archivo y las columnas ya utilizadas. Por descarte, Eva queda en 7:2.

La solución usa exactamente una persona por cada fila y columna y deja al menos una persona en cada zona. En Control solo quedan Diego y Eva, por lo que `findKiller()` identifica a Diego sin ambigüedad.
