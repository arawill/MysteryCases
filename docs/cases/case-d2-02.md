# D2/C02 — Protocolo Quimera

## Temática y plano

Laboratorio futurista de 7×7. El plano reparte Ensayos y Cápsulas en las filas 1–3; Limpieza forma una columna continua en 3:4–5:4; Análisis y Archivo ocupan las filas 4–5; y Control, las filas 6–7.

Objetos: mesa de laboratorio bloqueante en 1:1–1:2; acuario de laboratorio bloqueante en 1:5–1:6; cápsula de cristal bloqueante en 2:7; máquina de análisis bloqueante en 4:2; y arco de limpieza bloqueante en 4:4.

## Personajes y solución canónica

| Personaje | Posición | Pistas |
| --- | --- | --- |
| Claudia | 1:3 | Estaba en ensayos. Estaba junto a la mesa de laboratorio. |
| Héctor | 2:6 | Estaba en cápsulas. Estaba junto a la cápsula de cristal. |
| Miriam | 3:4 | Estaba en limpieza. Estaba junto al arco de limpieza. |
| Gabriel | 4:5 | Estaba en la cuarta fila. Estaba en el archivo. |
| Alicia | 5:1 | Estaba en la primera columna. Estaba en análisis. |
| Diego | 6:7 | Estaba en la séptima columna. Estaba al norte de Eva. |
| Eva (víctima) | 7:2 | Sin pistas. |

Diego es el asesino: es la única persona que comparte Control con Eva.

## Deducción

Las referencias visibles sitúan a Claudia junto a la mesa de laboratorio, a Héctor junto a la cápsula de cristal y a Miriam junto al arco de limpieza. Gabriel queda en la cuarta fila del Archivo y Alicia en la primera columna de Análisis.

Diego está en la séptima columna y al norte de Eva. Al combinar estas declaraciones con la regla de una persona por fila y columna, Diego queda en 6:7 y Eva en 7:2; el descarte fija el resto de posiciones canónicas.

La solución usa exactamente una persona por cada fila y columna y deja al menos una persona en cada zona. En Control solo quedan Diego y Eva, por lo que `findKiller()` identifica a Diego sin ambigüedad.
