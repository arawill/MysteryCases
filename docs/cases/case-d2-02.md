# D2/C02 — Protocolo Quimera

## Temática y plano

Laboratorio futurista de 7×7. El plano reparte Ensayos y Cápsulas en las filas 1–3; Limpieza forma una columna continua en 3:4–5:4; Análisis y Archivo ocupan las filas 4–5; y Control, las filas 6–7.

Objetos: mesa de laboratorio bloqueante en 1:1–1:2; acuario de laboratorio bloqueante en 1:5–1:6; cápsula de cristal bloqueante en 2:7; máquina de análisis bloqueante en 4:2; y arco de limpieza bloqueante en 4:4.

## Personajes y solución canónica

| Personaje | Posición | Pistas |
| --- | --- | --- |
| Claudia | 1:3 | Estaba en la tercera columna. Estaba al norte de Diego. |
| Héctor | 2:6 | Estaba en la sexta columna. Estaba una fila al sur de Claudia. |
| Miriam | 3:4 | Estaba en la cuarta columna. Estaba tres filas al norte de Diego. |
| Gabriel | 4:5 | Estaba en la quinta columna. Estaba una fila al norte de Alicia. |
| Alicia | 5:1 | Estaba en la primera columna. Estaba al sur de Héctor. |
| Diego | 6:7 | Estaba en la séptima columna. Estaba en la misma zona que Eva. |
| Eva (víctima) | 7:2 | Sin pistas. |

Diego es el asesino: es la única persona que comparte Control con Eva.

## Deducción

Las columnas identifican los carriles de Claudia, Héctor, Miriam, Gabriel, Alicia y Diego, pero no sus filas. Héctor queda una fila al sur de Claudia y Alicia al sur de Héctor. Miriam queda tres filas al norte de Diego.

Gabriel queda una fila al norte de Alicia. Diego comparte Control con Eva; al combinar las relaciones, las filas y columnas sin repetir, Diego queda en 6:7 y Eva en 7:2. Por descarte, quedan fijadas las demás posiciones canónicas.

La solución usa exactamente una persona por cada fila y columna y deja al menos una persona en cada zona. En Control solo quedan Diego y Eva, por lo que `findKiller()` identifica a Diego sin ambigüedad.
