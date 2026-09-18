# D2/C03 — Carga sin destinatario

## Temática y plano

La Argos es una nave carguera futurista de 7×7. Control ocupa las filas 1–2, columnas 1–3; Muelle, las filas 1–2, columnas 4–7; Bodega, las filas 3–5, columnas 1–4; Taller, las filas 3–4, columnas 5–7; Criogenia, las filas 5–7, columnas 5–7; y Esclusa, las filas 6–7, columnas 1–4.

Los cinco assets propios de D2/C03 son: el escáner de carga (`freightConsole`) en 1:1, posición ocupable explícita; el palé magnético bloqueante en 1:6–1:7; el cargamento modular bloqueante en 3:2–3:3; el dron de mantenimiento bloqueante en 3:5; y el contenedor criogénico bloqueante en 5:7. Los dos objetos anchos se dibujan una sola vez sobre su footprint completo.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Sara | 1:5 | Muelle | Estaba en el muelle. / Estaba junto al palé magnético. |
| Bruno | 2:2 | Control | Estaba en la segunda columna. / Estaba al sureste del escáner de carga. |
| Leire | 3:7 | Taller | Estaba en el taller. / Estaba en la séptima columna. |
| Marcos | 4:4 | Bodega | Estaba en la cuarta fila. / Estaba al sureste del cargamento modular. / Estaba junto a la pared del taller. |
| Noa | 5:6 | Criogenia | Estaba en la quinta fila. / Estaba junto al contenedor criogénico. |
| Adrián | 6:1 | Esclusa | Estaba en la sexta fila. / Estaba en la primera columna. |
| Vega (víctima) | 7:3 | Esclusa | Sin pistas. |

Adrián es el asesino: es la única persona que comparte la Esclusa con Vega.

## Deducción

Bruno queda en 2:2 al cruzar la segunda columna con la posición situada al sureste del escáner de carga. Sara está en el Muelle junto al palé; como Bruno ya usa la segunda fila, queda en 1:5. Marcos queda en 4:4: de las posiciones de la cuarta fila al sureste del cargamento modular, solo una toca la pared del Taller.

Noa queda en 5:6 por su fila y el contenedor criogénico. Adrián queda en 6:1 por fila y columna. Leire ocupa la séptima columna del Taller; Marcos ya ocupa la cuarta fila, por lo que queda en 3:7. Con las filas y columnas 1–6 utilizadas, Vega queda por descarte en 7:3.

La solución es única: cada pista fija una posición o reduce sus candidatas antes de que la restricción de una persona por fila y columna complete el último descarte. En la Esclusa solo aparecen Adrián y Vega, de modo que `findKiller()` identifica a Adrián.
