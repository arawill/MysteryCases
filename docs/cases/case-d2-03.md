# D2/C03 — Carga sin destinatario

## Temática y plano

La Argos es una nave carguera futurista de 7×7. Control ocupa las filas 1–2, columnas 1–3; Muelle, las filas 1–2, columnas 4–7; Bodega, las filas 3–5, columnas 1–4; Taller, las filas 3–4, columnas 5–7; Criogenia, las filas 5–7, columnas 5–7; y Esclusa, las filas 6–7, columnas 1–4.

Los cinco assets propios de D2/C03 son: la consola de control (`freightConsole`) bloqueante en 1:1; la plataforma de contenedores bloqueante en 1:6–1:7; la carretilla elevadora bloqueante en 3:2–3:3; el robot de mantenimiento bloqueante en 3:5; y la caja metálica bloqueante en 5:7. Los dos objetos anchos se dibujan una sola vez sobre su footprint completo.

## Personajes y solución canónica

| Personaje | Posición | Zona | Pistas |
| --- | ---: | --- | --- |
| Sara | 1:5 | Muelle | Estaba en la primera fila. / Estaba cinco filas al norte de Adrián. |
| Bruno | 2:2 | Control | Estaba en la segunda columna. / Estaba al norte de Marcos. |
| Leire | 3:7 | Taller | Estaba en el taller. |
| Marcos | 4:4 | Bodega | Estaba en la cuarta columna. / Estaba al sur de Leire. |
| Noa | 5:6 | Criogenia | Estaba en la sexta columna. / Estaba en criogenia. |
| Adrián | 6:1 | Esclusa | Estaba en la primera columna. / Estaba en la misma zona que Vega. |
| Vega (víctima) | 7:3 | Esclusa | Sin pistas. |

Adrián es el asesino: es la única persona que comparte la Esclusa con Vega.

## Deducción

Sara está en la primera fila y cinco filas al norte de Adrián, fijando la sexta fila para Adrián. Leire está en el Taller; Marcos está al sur de Leire en la cuarta columna, de modo que ambos quedan en 3:7 y 4:4. Bruno queda al norte de Marcos en la segunda columna.

Noa queda en Criogenia, en la sexta columna. Adrián comparte la Esclusa con Vega; con las filas y columnas restantes, Vega queda por descarte en 7:3.

La solución es única: cada pista conserva varias posiciones posibles por sí sola y la restricción de una persona por fila y columna completa la deducción global. En la Esclusa solo aparecen Adrián y Vega, de modo que `findKiller()` identifica a Adrián.
