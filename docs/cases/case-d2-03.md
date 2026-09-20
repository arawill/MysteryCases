# D2/C03 — Carga sin destinatario

## Temática y plano

La Argos es una nave carguera futurista de 7×7. Control ocupa las filas 1–2, columnas 1–3; Muelle, las filas 1–2, columnas 4–7; Bodega, las filas 3–5, columnas 1–4; Taller, las filas 3–4, columnas 5–7; Criogenia, las filas 5–7, columnas 5–7; y Esclusa, las filas 6–7, columnas 1–4.

Los cinco assets propios de D2/C03 son: la consola de control (`freightConsole`) bloqueante en 1:1; la plataforma de contenedores bloqueante en 1:6–1:7; la carretilla elevadora bloqueante en 3:2–3:3; el robot de mantenimiento bloqueante en 3:5; y la caja metálica bloqueante en 5:7. Los dos objetos anchos se dibujan una sola vez sobre su footprint completo.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Sara | 1:5 | Muelle | Estaba en el muelle. / Estaba junto a la plataforma de contenedores. |
| Bruno | 2:2 | Control | Estaba en la segunda columna. / Estaba en control. |
| Leire | 3:7 | Taller | Estaba en el taller. / Estaba en una esquina del taller. |
| Marcos | 4:4 | Bodega | Estaba en la cuarta fila. / Estaba junto a la pared de la bodega. |
| Noa | 5:6 | Criogenia | Estaba en criogenia. / Estaba junto a la caja metálica. |
| Adrián | 6:1 | Esclusa | Estaba en la primera columna. / Estaba al norte de Vega. |
| Vega (víctima) | 7:3 | Esclusa | Sin pistas. |

Adrián es el asesino: es la única persona que comparte la Esclusa con Vega.

## Deducción

Sara queda en el Muelle junto a la plataforma de contenedores y Leire en una esquina del Taller. Noa queda en Criogenia junto a la caja metálica. Bruno queda en la segunda columna de Control.

Marcos está en la cuarta fila junto a la pared de la Bodega. Adrián, en la primera columna, queda al norte de Vega; con las filas y columnas restantes, Vega queda por descarte en 7:3.

La solución es única: cada pista conserva varias posiciones posibles por sí sola y la restricción de una persona por fila y columna completa la deducción global. En la Esclusa solo aparecen Adrián y Vega, de modo que `findKiller()` identifica a Adrián.
