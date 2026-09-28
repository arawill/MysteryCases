# Auditoría de rendimiento del solver

Fecha de la medición: 27 de septiembre de 2026. Rama `pre`, commit `03fa697`. Esta auditoría es exclusivamente diagnóstica: no modifica solver, generador, reglas, límites, RNG ni tests.

> Actualización del 28 de septiembre de 2026: se implementó únicamente la primera optimización Nivel A. La evidencia, guardas, benchmark y rollback están en la sección 14. El resto de candidatos continúa sin implementar.

> Segunda actualización del 28 de septiembre de 2026: la optimización Nivel A #2 elimina las colecciones temporales de las comprobaciones booleanas de pistas globales conservando evaluación eager. Diseño, contrato y mediciones están en la sección 15.

## 1. Conclusión ejecutiva

La línea base calentada completa 200/200 solicitudes y tarda una mediana local de **48.101 ms**; el solver representa una mediana del **90,5 %**. La carga no está repartida uniformemente: D1–D2 son baratos, mientras Daily/Infinite D4–D5 concentran backtracking, comprobaciones de candidatos y casi todo el tiempo.

El perfil de CPU y los contadores concuerdan:

- `solveCaseWithStats` acumula el 85,63 % de las muestras de CPU y la búsqueda recursiva, el 84,42 %.
- `relationValid` acumula el 53,48 %; `evaluateClue`, el 35,57 %; `candidates`, el 25,19 %; `evaluateGlobalClue`, el 12,43 %.
- La matriz ejecuta 220.192 nodos y 79.490.539 comprobaciones de celda candidata en 3.373 llamadas.
- No hay llamadas idénticas por referencia, estructura ni canonicalización estricta. Una caché genérica no tendría aciertos en esta muestra.
- Sí hay 210 resoluciones finales que repiten el caso aceptado, pero la primera usa `maxNodes: 4000` y la segunda no. Son reutilizables únicamente cuando el primer resultado está demostrado como exhaustivo (`truncated === false`), único y referido al conjunto final exacto.
- `no-counterexample-clue` causa el 70,9 % de todos los rechazos observados, pero no llama al solver en el punto del rechazo. El coste dominante son las resoluciones anteriores que produjeron los dos contraejemplos; el ranking de pistas es secundario.

**Primer cambio mínimo recomendado para una fase posterior:** permitir que la validación/análisis final consuma el `SolveResult` final ya calculado, únicamente bajo una precondición explícita de conjunto de pistas idéntico, resultado no truncado y una solución. Mantendría la validación estructural y la comparación canónica. El techo observado es eliminar 210/3.373 llamadas (6,23 %) y aproximadamente 1,03 s, un 2,3 % del tiempo de solver de esta matriz. No debe generalizarse a una caché que ignore `maxNodes`.

## 2. Alcance, entorno y método

Se revisaron `solver.ts`, evaluadores de pistas locales y globales, reglas, traits, superficies y edge features; generadores de escenario, placement y puzzle; `analysis.ts`, `validation.ts`, construcción/ranking de contraejemplos, observabilidad, CLI y tests de solver, generación, RNG y fingerprints. También se leyeron las tres auditorías previas indicadas.

Entorno local:

| Elemento | Valor |
| --- | --- |
| SO/arquitectura | Windows `win32 x64` |
| CPU | AMD Ryzen 9 7900X, 12 núcleos/24 procesadores lógicos |
| RAM | 33.487.908.864 bytes (~31,2 GiB) |
| Node / V8 | Node 24.20.0 / V8 13.6.233.17-node.53 |
| npm / TypeScript | npm 11.19.0 / TypeScript 6.0.3 |
| Generador / diagnóstico | v7 / v1 |
| Dataset | 20 seeds fijas por modo y dificultad: Daily+Infinite, D1–D5; 200 solicitudes |

El primer arranque de Vite se usó solo como calentamiento y se excluyó. Después se ejecutó tres veces `audit:procedural-retries -- --samples=20`. Los perfiles temporales de CPU/heap se guardaron bajo `%LOCALAPPDATA%\Temp`, se analizaron y se eliminaron. La instrumentación temporal de finalidad, claves y contadores se retiró antes de validar.

Los tiempos son evidencia de esta máquina y esta carga, no garantías universales. Los conteos, seeds, offsets, motivos y fingerprints sí son deterministas. El perfil de CPU añade sobrecarga y tardó un 3,7 % más que la mediana calentada; sirve para distribuir coste, no como nueva línea base.

## 3. Mapa completo de llamadas

```text
Daily generateDailyCase ─┐
                        ├─ candidato de seed/offset
Infinite generate… ─────┘
  └─ generateScenarioTemplate
       └─ generateValidPlacement                    0 llamadas de solver
  └─ generatePuzzle
       ├─ solveSelected(selected)                   resolución inicial
       │    └─ applyConstraints → solveCase(maxSolutions=2, maxNodes=4000)
       ├─ rank counterexamples                      0 llamadas nuevas
       ├─ solveSelected(selected + clue) × N        refinamientos
       ├─ minimización                              desactivada en procedural
       ├─ validación final con result/solveSelected normalmente reutiliza result
       └─ analyzeCase(generated)
            └─ validateCaseDefinition → solveCase() validación/análisis final
```

La factibilidad y construcción del escenario usan `generateValidPlacement`, no el solver auditado. La búsqueda de contraejemplo tampoco abre una consulta: compara como máximo las dos soluciones ya devueltas. Todas las llamadas reales son evaluaciones del candidato dentro de `generatePuzzle`.

La clasificación siguiente incluye la matriz y la reproducción extrema solicitada (201 solicitudes, 3.430 llamadas), porque la instrumentación de finalidad se ejecutó conjuntamente:

| Finalidad real | Llamadas | % | Tiempo solver acumulado | Media/llamada | ¿Recalcula información? |
| --- | ---: | ---: | ---: | ---: | --- |
| Resolución inicial del candidato | 701 | 20,44 % | 11.064,5 ms | 15,78 ms | Produce las soluciones usadas para aceptar, refinar o rechazar |
| Refinamiento después de añadir una pista | 2.518 | 73,41 % | 31.807,6 ms | 12,63 ms | Nuevo conjunto de pistas; no es consulta equivalente |
| Análisis/validación final | 211 | 6,15 % | 1.031,0 ms | 4,89 ms | Sí: vuelve a resolver el conjunto final ya demostrado único |
| Factibilidad/validación de escenario | 0 | 0 % | 0 | — | Placement tiene su propia búsqueda |
| Ranking de contraejemplos | 0 | 0 % | 0 | — | Reutiliza `result.solutions` |
| Minimización procedural | 0 | 0 % | 0 | — | `minimizeClues` es `false` |

Cada candidato tiene exactamente una resolución inicial. Los 701 candidatos se descomponen en 201 aceptados y 500 rechazados (los 479 de la matriz más 21 del extremo). “Solución única” no es una llamada separada: es el resultado de la inicial o de un refinamiento. La validación final sí constituye una llamada separada y sin límite de nodos.

Agrupando las llamadas por desenlace posterior del candidato en ese mismo conjunto de 201 solicitudes:

| Desenlace | Eventos | Llamadas acumuladas | Tiempo solver | Nodos | Checks de candidato |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aceptado | 201 | 1.067 | 7.552,1 ms | 31.691 | 10.041.057 |
| `no-counterexample-clue` | 391 | 1.513 | 12.650,1 ms | 71.509 | 23.267.338 |
| Límite de evaluación | 43 | 323 | 9.774,6 ms | 30.089 | 11.496.041 |
| Límite de refinamiento | 49 | 441 | 8.010,8 ms | 45.445 | 17.955.296 |
| Calidad posterior | 10 | 78 | 2.461,7 ms | 12.643 | 5.877.346 |
| Límite de nodos | 7 | 8 | 3.453,8 ms | 29.403 | 10.896.963 |

Estos grupos atribuyen a cada desenlace todo el solver consumido desde que empezó ese candidato; no significan que lanzar la excepción cueste ese tiempo.

## 4. Línea base reproducible

### 4.1 Repeticiones calentadas

| Repetición | Solicitudes | Duración | Solver | Candidatos/rechazos |
| --- | ---: | ---: | ---: | --- |
| 1 | 200/200 | 48.363 ms | 90,4 % | Deterministas |
| 2 | 200/200 | 48.101 ms | 90,5 % | Deterministas |
| 3 | 200/200 | 48.090 ms | 90,5 % | Deterministas |
| **Mediana** | **200/200** | **48.101 ms** | **90,5 %** | **3,40 de media** |

La amplitud fue 273 ms (0,57 % de la mediana). En cada ejecución hubo 133 fallbacks (66,5 %), 3.373 llamadas, mediana de 2 candidatos, P90 7, P95 10, P99 12 y máximo 17. Rechazos: `no-counterexample-clue=370`, límite de refinamiento 49, límite de evaluación 43, factibilidad de placement 27, layout de zonas 16, calidad posterior 10 y límite de nodos 7.

La observabilidad estándar no calcula percentiles de duración. Una ejecución instrumentada de la misma matriz, usada para obtenerlos y no para sustituir la mediana, dio 49.029,8 ms total: media 245,149 ms/solicitud, P50 30,856, P90 685,136, P95 1.154,891, P99 3.198,022 y máximo 3.536,533 ms.

### 4.2 Coste por modo y dificultad

Los tiempos de solicitud y porcentaje son de la ejecución instrumentada; llamadas/nodos/checks son conteos deterministas. Hay 20 solicitudes por fila.

| Modo | D | Intentos medios | Tiempo total | Media solicitud | Solver | Llamadas | ms solver/llamada | Nodos | Checks | Truncadas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Daily | 1 | 3,30 | 177,3 ms | 8,866 ms | 38,5 % | 187 | 0,365 | 1.859 | 135.488 | 0 |
| Daily | 2 | 2,75 | 178,4 ms | 8,921 ms | 35,7 % | 168 | 0,379 | 1.807 | 189.633 | 0 |
| Daily | 3 | 2,25 | 2.296,7 ms | 114,834 ms | 89,8 % | 276 | 7,469 | 23.416 | 7.306.702 | 1 |
| Daily | 4 | 5,15 | 12.035,6 ms | 601,782 ms | 91,8 % | 674 | 16,398 | 67.945 | 26.310.550 | 4 |
| Daily | 5 | 4,60 | 12.589,1 ms | 629,455 ms | 90,6 % | 515 | 22,139 | 33.831 | 12.647.969 | 0 |
| Infinite | 1 | 3,25 | 129,9 ms | 6,497 ms | 40,5 % | 176 | 0,299 | 1.780 | 128.105 | 0 |
| Infinite | 2 | 3,30 | 261,0 ms | 13,049 ms | 37,6 % | 246 | 0,399 | 2.887 | 314.816 | 0 |
| Infinite | 3 | 2,40 | 1.571,0 ms | 78,551 ms | 84,7 % | 302 | 4,408 | 12.888 | 3.983.932 | 0 |
| Infinite | 4 | 3,45 | 9.440,0 ms | 472,002 ms | 93,7 % | 440 | 20,097 | 46.992 | 18.107.538 | 2 |
| Infinite | 5 | 3,50 | 10.350,7 ms | 517,534 ms | 90,1 % | 389 | 23,965 | 26.787 | 10.365.806 | 0 |

Total de la matriz: 220.192 nodos, 79.490.539 checks, 2.985.620 podas relacionales, 289.574 podas de forward checking y 7 resoluciones truncadas que se convierten en rechazo del candidato.

La instrumentación interna cronometró 43.882,7 ms dentro de las 3.373 invocaciones de `solveCase`: media 13,01 ms y máximo 961,62 ms por llamada. La llamada más grande alcanzó el límite de 4.000 nodos. El perfil muestreado de V8 no proporciona un conteo exacto de invocaciones de helpers como `evaluateClue`; por eso no se inventa una media por helper: se combinan su tiempo muestreado con los conteos reales de llamadas/nodos/checks del solver.

Daily D4 necesita más candidatos que Daily D5 en estas seeds: 5,15 frente a 4,60; también hace 674 frente a 515 llamadas y 67.945 frente a 33.831 nodos. D5, sin embargo, cuesta más por llamada (22,139 frente a 16,398 ms) debido a evaluaciones de pistas/traits/globales más ricas, y termina ligeramente por encima en tiempo. D4 acumula 25 límites de refinamiento y D5, 27 límites de evaluación; la muestra es de solo 20 por celda y no demuestra que D4 sea intrínsecamente más propenso al retry. Es un resultado de estas seeds, no causalidad.

### 4.3 Seed extrema

Daily D1, fecha local 2026-01-21: base `648429649`, seed efectiva `648429670`, offset 21, 22 candidatos. Los 21 rechazos previos fueron `no-counterexample-clue`. Pese al retry extremo, fue barato: 57 llamadas, 588 nodos, 43.502 checks y 20,4 ms dentro de `solveCase` (52,6 ms totales medidos). Confirma que cantidad de candidatos y coste no son intercambiables.

## 5. Perfil de CPU: tiempo propio y acumulado

Perfil V8 de la matriz, 51.979 ms muestreados. “Acumulado” incluye descendientes y se corrigió para no contar dos veces la recursión.

| Función/zona | Tiempo propio | % propio | Acumulado | % acumulado | Interpretación |
| --- | ---: | ---: | ---: | ---: | --- |
| `evaluateClue` | 13.764 ms | 26,48 % | 18.487 ms | 35,57 % | Evaluación repetida, búsquedas lineales y helpers de celda/zona/traits |
| `relationValid` | 7.369 ms | 14,18 % | 27.800 ms | 53,48 % | Construye placement provisional y reevalúa relaciones/globales |
| `evaluateGlobalClue` | 3.574 ms | 6,88 % | 6.461 ms | 12,43 % | Conteos repetidos sobre placements/celdas |
| filtro de `candidates` | 1.724 ms | 3,32 % | 10.991 ms | 21,15 % | Recorre dominios estáticos y aplica restricciones |
| `zoneOccupancy` | 1.351 ms | 2,60 % | 2.460 ms | 4,73 % | `filter`/conteo repetido |
| búsqueda recursiva | 1.191 ms | 2,29 % | 43.882 ms | 84,42 % | MRV, ordenación, forward check y recursión |
| frontier del escenario | 1.038 ms | 2,00 % | — | — | Generador fuera del solver |
| `countZoneTrait` | 799 ms | 1,54 % | — | — | Evaluación global/traits |
| búsqueda de placement | 683 ms | 1,31 % | 901 ms | 1,73 % | Generador fuera del solver |
| `companionsWithTrait` | 467 ms | 0,90 % | — | — | Filtros y lookup de personajes |
| ranking de candidato de pista | 424 ms | 0,82 % | 974 ms | 1,87 % | Preparación de contraejemplos fuera del solver |
| `generatePuzzle` | 386 ms | 0,74 % | 47.174 ms | 90,76 % | Orquestador; casi todo acumulado es solver |
| `getCell`/`cellFor` | 330 ms | 0,63 % | — | — | Lookups lineales repetidos |

`solveCaseWithStats` acumula 44.509 ms (85,63 %). `solveSelected` acumula 43.574 ms (83,83 %). El código de aplicación suma 36.879 ms de tiempo propio muestreado (70,95 %); el resto corresponde a runtime, Vite SSR y profiler. El wrapper de observabilidad consume 3 ms propios (0,01 %): su acumulado no debe confundirse con overhead, porque engloba deliberadamente la función medida.

Coste necesario: explorar alternativas, comprobar filas/columnas, pistas y detenerse en la segunda solución. Coste accidental: reconstruir arrays/objetos, hacer búsquedas lineales sobre datos inmutables y ordenar todas las opciones MRV en cada nodo. Coste ajeno: escenario/placement y ranking representan porcentajes pequeños y separados en la tabla. Validación final: ~1,03 s/211 llamadas en el conjunto ampliado.

## 6. Asignaciones y estructuras transitorias

El heap profiler con intervalo de 32 KiB registró 12.668.720 bytes muestreados, pero Vite SSR atribuyó las asignaciones de módulos transformados a URLs/frames anónimos: no existe base fiable para publicar bytes por función. Por ello las frecuencias siguientes proceden del código y de contadores, y son estimaciones de presión de asignación, no bytes exactos.

| Hotspot | Frecuencia/evidencia | Coste accidental | Riesgo de cambiarlo | Prueba de equivalencia |
| --- | --- | --- | --- | --- |
| `candidates`: nuevo `filter` de dominio | 79,49 M checks; se invoca para ranking y otra vez en forward check | Arrays de candidatos descartados | Medio: el orden controla soluciones/límites | Soluciones ordenadas, stats, truncación y fingerprints seed por seed |
| `relationValid`: `proposed`, `relevant`, `[...placements, proposed]` | En el bucle de candidatos; hasta un subconjunto grande de los checks | Objetos/arrays y escaneo de relaciones entrantes | Bajo-medio si se preindexa conservando orden | Clues relacionales, excepciones y orden exacto |
| MRV: `map` de no colocados + `sort` | Hasta una vez por cada uno de 220.192 nodos | Objetos de ranking y ordenación completa | Medio: desempate afecta recorrido | Traza de soluciones/nodos y casos truncados |
| Globales: `evaluateAllGlobalClues(...).map(...).some(...)` | Dentro de validación parcial relacional | Array de wrappers aunque solo se necesita “alguna violada” | Bajo si se conserva orden/short-circuit | Todos los tipos globales en parcial/completo |
| `evaluateClue`: `find` de placement/celda/personaje, `filter` de zona/objeto/trait | 26,48 % CPU propio | Reescanea estructuras inmutables | Bajo-medio con índices locales read-only | Suite de clues, footprints, traits y malformed inputs |
| `applyConstraints` | Una reconstrucción por consulta de `solveSelected`; miles en la matriz | Clona zonas, board/objetos, personajes/traits y pistas | Medio: aliasing/inmutabilidad | Congelación/mutación, validación y fingerprints |
| Firma local de IDs | Cada `solveSelected`: `map/sort/join` | Cadena y ordenación | Bajo, pero ya evita repeticiones en minimización | Orden de IDs, IDs duplicados y colisiones |
| Clonado de solución encontrada | Solo al registrar solución | Necesario para no exponer backtracking mutable | Alto si se elimina | Mutación posterior y orden exacto |

Medición limpia, sin retener diagnósticos ni claves: tras calentamiento+GC, heap usado 35.559.712 bytes; pico observado **entre solicitudes** 150.022.632; antes del GC final 145.893.672; después 36.364.568. RSS pasó de 202.825.728 a un pico de 323.366.912 bytes y no baja inmediatamente porque V8 conserva páginas. Esto demuestra presión transitoria y ausencia de retención heap material al acabar (+804.856 bytes frente a baseline), pero no captura el pico dentro de una llamada.

Un prototipo que conservaba todas las claves y registros llegó a 313 MB de heap; ese valor pertenece al profiler, no al producto, y queda excluido de la línea base.

## 7. Consultas repetidas y coste de una caché

Dos llamadas solo se consideraron estrictamente equivalentes si preservan:

- contenido **y orden** de personajes, board, pistas de cada personaje, globales, zonas y objetos;
- todos los campos que leen evaluadores/reglas, no solo IDs de pistas;
- `maxSolutions` y `maxNodes` exactos;
- comportamiento ante pistas inválidas/excepciones y orden de soluciones.

Resultados sobre matriz+extremo (3.430 llamadas):

| Definición | Repeticiones | Tasa | Dónde |
| --- | ---: | ---: | --- |
| Mismo objeto por referencia | 0 | 0 % | — |
| Estructura completa + opciones exactas | 0 | 0 % | — |
| Snapshot solver-relevante canonicalizado de forma conservadora + opciones | 0 | 0 % | — |
| Igual ignorando solo `maxNodes` | 211 | 6,15 % | Análisis final; 210/3.373 (6,23 %) en la matriz |
| Estrictas dentro del mismo candidato | 0 | 0 % | — |
| Estrictas entre candidatos de una solicitud | 0 | 0 % | — |
| Estrictas entre modos/solicitudes | 0 | 0 % | — |

La caché local existente se basa en IDs de pistas ordenados y es útil para la minimización general, pero `minimizeClues=false` hace que no produzca un segundo `solveSelected` en estos flujos. Los objetos de caso son nuevos, así que una `WeakMap` por referencia tampoco acertaría.

Para cuantificar el impuesto de una caché estructural, la instrumentación creó tres variantes JSON por llamada: 301,5 ms en total, unas 28.712 posiciones de carácter combinadas por llamada (~9.571 por clave). El máximo de strings retenidos dentro de una solicitud fue ~2.235.028 bytes estimando UTF-16. Fue instrumentación deliberadamente exhaustiva, no un diseño recomendado. Con 0 aciertos estrictos, serializar, comparar y retener esas claves solo añadiría CPU/memoria.

La igualdad “sin `maxNodes`” no es una equivalencia general: el límite cambia truncación, excepciones y decisiones posteriores. En este flujo concreto puede existir una reutilización dirigida porque `solveSelected` rechaza de inmediato todo resultado truncado; si llega al final con una solución y el mismo conjunto seleccionado, la búsqueda con `maxSolutions: 2` terminó exhaustivamente. Esa prueba debe estar expresada en la API, no inferida por una caché permisiva.

## 8. Pureza y seguridad de memoización

El solver es funcionalmente local respecto a sus datos:

- no lee `caseData.solution` para resolver;
- no usa RNG, reloj, I/O, callbacks ni estado global;
- dominios, placements, contadores y soluciones se crean dentro de cada invocación;
- no muta `caseData`; clona placements al guardar una solución;
- el contador de nodos pertenece a la llamada y `maxNodes` forma parte de su semántica.

No es independiente del orden. El orden de personajes decide desempates MRV; el board decide recorrido de dominio; pistas/globales deciden short-circuit y qué excepción aparece primero; el DFS decide orden de soluciones. Ordenar entradas para “canonicalizarlas” puede cambiar solución 1/2, nodos, truncación y resultado del generador aunque el conjunto matemático sea igual.

Una memoización transparente requiere snapshot inmutable de todos los campos solver-relevantes, orden preservado, opciones exactas y política de excepciones. Debe limitarse a una solicitud para evitar crecimiento y entradas obsoletas si alguien muta objetos. Incluso cumpliéndolo, la tasa observada es cero. No deben cachearse como equivalentes resultados con distinto `maxNodes`, ni errores de validación sin preservar exactamente tipo/mensaje/orden.

Si se memoizara `solveCaseWithStats`, también habría que devolver una copia de los mismos stats; no sería correcto omitir nodos/checks por haber acertado la caché. En el generador, eliminar de verdad la segunda resolución final reducirá deliberadamente `solverCalls` y `solverMilliseconds` de la observabilidad: esos son contadores de trabajo realizado, no estado del juego. El contrato del cambio debe exigir casos, RNG, decisiones, errores y fingerprints idénticos, y actualizar la expectativa diagnóstica a 210 llamadas reales menos.

La reutilización final dirigida sí puede ser segura si demuestra simultáneamente:

1. el conjunto y orden efectivos de pistas no cambió después del solve;
2. la instancia solver-relevante solo cambia en `id` o se compara explícitamente;
3. `truncated === false`;
4. `solutionsFound === 1` con `maxSolutions >= 2`;
5. se vuelve a ejecutar `validateCaseDefinition` y la comparación con la solución canónica;
6. no se consume RNG y se preservan errores/fingerprints.

## 9. `no-counterexample-clue`

En la matriz son 370 de 522 rechazos totales (70,9 %). Si se excluyen los 43 fallos previos de escenario, son 370 de 479 desenlaces de candidato (77,2 %). Con la seed extrema: 391 desenlaces, 1.513 llamadas previas, 12,65 s de solver, 71.509 nodos y 23,27 M checks.

Secuencia exacta:

1. el solve actual devuelve dos soluciones;
2. se reconstruye `current = applyConstraints(...)` una vez;
3. se filtran todas las pistas elegibles;
4. para cada pista se evalúa cuántas de las dos soluciones viola y un bonus de familia;
5. se filtra `eliminated > 0`, se ordena y se toma la primera;
6. si no existe, se lanza `No readable clue eliminates the current counterexamples`.

No hay un solve adicional en el paso 6 ni se vuelven a resolver estados conocidos durante el ranking. Las soluciones ya calculadas son la entrada del detector. La preparación sí crea arrays/objetos y reevalúa candidatos; el perfil sitúa ese ranking en 0,82 % propio/1,87 % acumulado, frente a 85,63 % acumulado de `solveCaseWithStats`. Optimizar solo el ranking tiene un techo bajo.

Mejoras semánticamente neutras posibles: índices read-only para evaluar las mismas pistas, eliminar wrappers intermedios y reutilizar `current` dentro del ranking como ya se hace. Fuera de alcance: cambiar orden/prioridad de pistas, introducir pistas nuevas o relajar elegibilidad para reducir rechazos; cualquiera produciría otros casos, offsets y fingerprints.

## 10. Candidatos de optimización

### Nivel A — transparentes si se aplican con las precondiciones indicadas

| Orden | Propuesta | Evidencia / beneficio esperado | Riesgo y complejidad | Memoria / rollback / fingerprints | Tests necesarios |
| ---: | --- | --- | --- | --- | --- |
| 1 | Pasar el resultado final exhaustivo al análisis, sin segundo solve | 210/3.373 llamadas; ~1,03 s y ~2,3 % de tiempo solver como techo local | Bajo-medio; cambio pequeño, pero debe mantener la validación independiente y guardas de truncación | Sin caché; rollback trivial; fingerprints deben quedar idénticos | Resultados truncados/no truncados, 0/1/2 soluciones, conjunto cambiado, errores de validación, snapshots/RNG/fingerprints |
| 2 | Comprobar globales con `some`/`every` directo, sin construir el array de resultados | `evaluateGlobalClue`: 6,88 % propio; elimina una asignación por comprobación parcial | Bajo; conservar orden y short-circuit | Sin memoria adicional; rollback trivial; fingerprints esperados iguales | Todos los globales, parciales/completos y excepción en el mismo orden |
| 3 | Crear índices inmutables por solve: celda por posición, personaje por ID, celdas por zona/objeto, owners por trait | `evaluateClue` 26,48 % propio; `getCell`/`cellFor`, filtros y `find` repetidos | Bajo-medio; contexto interno más amplio | O(board+characters) por llamada, liberado al volver; rollback localizado | Clues/traits/footprints/edge features, objetos mutados y salida ordenada |
| 4 | Preclasificar pistas propias, relacionales entrantes, occupancy y globales preservando orden | `relationValid` 14,18 % propio/53,48 % acumulado; evita construir `relevant` y escanear todas las listas | Bajo-medio; cuidado con relaciones entrantes y orden de errores | Arrays pequeños por solve; rollback localizado | Relaciones dirigidas, múltiples pistas, IDs inválidos, orden de soluciones y stats |

La propuesta 1 es la primera recomendada porque elimina trabajo demostrado idéntico sin diseñar claves ni alterar el DFS. La 2 es el cambio interno más pequeño si se prefiere conservar temporalmente la segunda resolución como defensa redundante; su beneficio debe medirse, no extrapolarse de todo el coste global.

Una caché estructural genérica **no** entra en Nivel A recomendado: 0 % de aciertos estrictos y coste de clave medido. Solo se reconsideraría si otro flujo muestra repeticiones reales.

### Nivel B — riesgo medio

| Propuesta | Beneficio posible | Riesgo / motivo de no priorizar | Memoria y rollback |
| --- | --- | --- | --- |
| Representación interna indexada común para solver y todos los evaluadores | Ataca simultáneamente los mayores hotspots | Refactor amplio; puede cambiar aliasing, errores y orden | O(datos del caso); rollback por módulo, exige equivalencia exhaustiva |
| Evitar arrays de candidatos y hacer forward-check con iteradores/short-circuit | Reduce asignaciones sobre 79,49 M checks | Puede cambiar conteos, excepción observada y orden con límites | Menor memoria; rollback simple pero tests delicados |
| MRV incremental o sin ordenar toda la lista | Reduce trabajo por 220.192 nodos | Desempates/orden de exploración afectan soluciones y `maxNodes` | Estado adicional por nivel; rollback medio |
| Dominios incrementales/memo por estado de búsqueda | Puede reducir reevaluación relacional/global | Clave/invalidación compleja; coste y memoria no medidos | Potencialmente grande; rollback difícil |
| Caché compartida entre candidatos o solicitudes | Podría ayudar en otro dataset | 0 aciertos estrictos aquí; riesgo de memoria y mutación | Requiere límite/evicción; no justificada |

### Nivel C — cambia generación y se descarta

- Cambiar orden de personajes, celdas, pistas, globales, desempates MRV o ranking de contraejemplos.
- Cambiar podas, `maxNodes`, `maxSolutions`, límites de refinamiento/evaluación o reglas de aceptación.
- Añadir/retirar pistas para evitar `no-counterexample-clue` o saltar candidatos.
- Cambiar número/orden de llamadas RNG, seed, offset, IDs o canonicalización usada por fingerprints.

Aunque alguna reduzca tiempos o retries, cambia recorrido, errores o casos generados y no pertenece a esta línea de trabajo.

## 11. Benchmark y prueba del primer cambio

El cambio posterior debe compararse contra esta misma matriz en proceso recién iniciado, siempre con una ejecución de calentamiento excluida y al menos cinco repeticiones alternadas base/candidato. Registrar mediana y dispersión, no solo el mejor tiempo.

Mínimos del benchmark:

- 20 Daily + 20 Infinite por D1–D5, mismas seeds y fecha local; seed `648429649`/offset 21 adicional.
- Conteos exactos: 200/200, 133 fallbacks, intentos por percentil, motivos, offsets, llamadas, nodos, checks, podas y truncaciones.
- Tiempo total, solver, por modo/D, P50/P90/P95/P99/máximo y memoria tras GC.
- Comparación byte/estructura de cada caso, orden de soluciones, IDs, killer, traza RNG y fingerprints.
- Para la propuesta 1 se espera restar exactamente 210 llamadas de la matriz, no cambiar las restantes y mantener 0 fallos. El objetivo temporal razonable es cercano al 2–3 % total local; no es criterio contractual.

Tests permanentes necesarios:

1. helper de análisis con resultado precalculado produce exactamente el mismo `CaseAnalysis` que `analyzeCase` para 0, 1 y 2 soluciones;
2. rechaza o no reutiliza resultado truncado, conjunto distinto u opciones insuficientes;
3. conserva `validationErrors`, `matchesCanonical`, solución y orden;
4. spy demuestra una sola resolución final cuando la precondición se cumple y fallback a solve cuando no;
5. tests de solver/clues/globales/validator existentes;
6. procedural Daily/Infinite D1–D5, observabilidad y límites;
7. RNG, snapshots y fingerprints exactos antes/después;
8. auditorías de 20 y 250, perfil D5, Normal y builds offline.

Rollback: una sola ruta de llamada puede volver a `analyzeCase(generated)`. No requiere migración, persistencia ni dependencia.

## 12. Validación final de la auditoría original

Toda la instrumentación temporal se retiró antes de esta batería.

| Validación | Resultado exacto |
| --- | --- |
| Rama/estado inicial | `pre`; limpio; commit `03fa697` |
| TypeScript | `npx tsc -b`: correcto, sin diagnósticos |
| Oxlint | `npm run lint`: correcto, sin diagnósticos |
| Solver/generación/observabilidad/RNG/fingerprints dirigidos | 17 archivos, 142 tests correctos, 7,10 s |
| Suite completa | 92 archivos, 615 tests correctos, 8,14 s |
| Auditoría de retries, 20/mode+D | 200/200 éxitos, 133 fallbacks, 0 fallos; 3.373 llamadas; 49.268 ms; 90,5 % solver; intentos media 3,40, P95 10, máximo 17; motivos exactamente iguales a la línea base |
| Auditoría de pistas | 250 puzzles correctos; D1 380 ms, D2 593 ms, D3 4.837 ms, D4 18.411 ms, D5 42.150 ms; 181 fallbacks, 0 fallos, 4.508 llamadas |
| Perfil D5 oficial | 20/20 éxitos, 0 fallos; media 852 ms, máximo 2.664 ms (caso 15); 28,1 llamadas de solver por solicitud, máximo 88; 91,06 % solver; offset medio 4,2, máximo 15 |
| Casos Normal | 21 casos publicados verificados |
| Web/PWA | `verify:pwa` correcto; 458 módulos; 225 entradas y 112.872,02 KiB de precache |
| GitHub Pages | Build y verificadores PWA/Pages correctos; 458 módulos; 225 entradas y 112.874,81 KiB |
| Capacitor/Android | Build web, copia, `cap sync android` y verificador Android correctos |
| APK debug offline | Primer intento desde la raíz: fallo de invocación antes de compilar porque allí no existe `settings.gradle`; repetido desde `android/`: `BUILD SUCCESSFUL in 1s`, 93 tareas (24 ejecutadas, 69 up-to-date), 120.181.559 bytes |
| `git diff --check` | Correcto; solo avisos LF→CRLF conocidos en dos archivos generados de Capacitor, sin diff material |
| Limpieza | Perfiles CPU/heap y scripts/instrumentación temporales eliminados; único cambio final: este informe |
| Red | No utilizada; Gradle se ejecutó con `--offline` |

Avisos no bloqueantes: chunk web minificado mayor de 500 kB; `flatDir` y features de Gradle deprecadas antes de Gradle 9. Ninguno impidió el build o los verificadores.

## 13. Límites de la evidencia

- CPU es muestreo, no cronometraje exacto por invocación; llamadas/nodos/checks sí proceden de contadores deterministas.
- El perfil de heap no pudo atribuir bytes de Vite SSR a funciones fuente; las asignaciones se justifican por código+frecuencia, no por cifras inventadas.
- El pico de heap se observó entre solicitudes, no dentro de cada DFS.
- 20 muestras por modo/dificultad permiten reproducir esta carga, no inferir todas las distribuciones posibles.
- En la auditoría original no se implementó ninguna optimización; sus beneficios eran techos/hipótesis. La sección 14 registra la implementación posterior y su evidencia real.

## 14. Implementación de la primera optimización Nivel A

### Diseño y guardas

`analyzeCase(caseData, { precomputed })` acepta ahora evidencia opcional y opaca. `PrecomputedCaseAnalysis.create` solo la emite cuando:

1. `maxSolutions` efectivo es un entero mayor o igual que 2;
2. `maxNodes`, si existe, es un entero positivo;
3. el resultado no está truncado —el solver representa el falso histórico como `undefined`; la evidencia lo normaliza a `false`—;
4. hay exactamente una solución tanto en `solutionsFound` como en `solutions`;
5. cada placement tiene personaje, fila y columna válidos en formato;
6. el snapshot JSON completo y ordenado del caso resuelto coincide con el objetivo; solo se permite cambiar `id`, y el ID objetivo queda incorporado a la evidencia;
7. el caso entregado posteriormente a `analyzeCase` sigue coincidiendo byte a byte con ese snapshot.

El snapshot incluye dificultad, solución canónica, orden de personajes, pistas por personaje, globales, board/objetos, zonas, edge features y traits. No ordena IDs ni canonicaliza colecciones. Ausencia y propiedad opcional con `undefined` se consideran equivalentes porque JSON las representa igual y el solver/validator también.

La evidencia clona la solución al crearse y vuelve a clonarla al construir el análisis. Una mutación posterior del caso invalida el snapshot y activa fallback. Una evidencia ausente, desconocida, falsificada, insuficiente, con cero/dos soluciones, truncada o creada con `maxSolutions < 2` nunca se reutiliza.

`validateCaseDefinition` se ejecuta siempre antes de consultar la evidencia. Por tanto se conservan orden/contenido de errores, validación estructural y semántica, IDs/referencias, dificultad y solución canónica. `placementsEqual` sigue calculando `matchesCanonical` al construir el mismo `CaseAnalysis`.

### Integración procedural y fallback

`solveSelected` conserva únicamente el contexto del solve real más reciente —caso exacto, resultado y opciones—, no una caché adicional. La caché local de resultados mantiene su forma anterior. El caso final continúa reconstruyéndose con `applyConstraints`; la fábrica compara esa reconstrucción completa con el contexto original.

La reutilización solo se intenta para `options.procedural && !minimizeClues`, cuando el resultado final es exactamente el mismo objeto devuelto por ese solve. Si la fábrica no puede probar todas las condiciones, `analyzeCase` ejecuta `solveCase` como antes y la instrumentación envuelve esa llamada real. Cuando la evidencia es válida no se llama a `measureSolver`: no se emite una llamada ficticia ni tiempo ficticio. El formato diagnóstico sigue siendo v1.

### Benchmark reproducible

Línea base calentada inmediatamente anterior al cambio: 200/200, 133 fallbacks, 0 fallos, 3.373 llamadas, 49.338 ms, 90,5 % solver; intentos y rechazos coinciden con la auditoría histórica cuya mediana era 48.101 ms.

Cinco rondas posteriores sobre el mismo dataset:

| Ronda | Éxitos/fallbacks/fallos | Llamadas | Total | Solver | P50 | P90 | P95 | P99 | Máximo |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 200/133/0 | 3.163 | 46.119,884 ms | 90,263 % | 24,018 | 639,730 | 1.132,641 | 3.119,150 | 3.318,511 |
| 2 | 200/133/0 | 3.163 | 44.812,951 ms | 90,329 % | 25,157 | 627,406 | 1.108,404 | 3.046,608 | 3.273,185 |
| 3 | 200/133/0 | 3.163 | 44.942,419 ms | 90,461 % | 24,091 | 631,526 | 1.087,869 | 3.045,342 | 3.395,148 |
| 4 | 200/133/0 | 3.163 | 44.338,231 ms | 90,404 % | 24,467 | 625,710 | 1.054,408 | 3.060,024 | 3.203,633 |
| 5 | 200/133/0 | 3.163 | 44.775,022 ms | 90,279 % | 23,527 | 609,167 | 1.102,768 | 3.122,281 | 3.223,122 |
| **Mediana** | **200/133/0** | **3.163** | **44.812,951 ms** | **90,329 %** | **24,091** | **627,406** | **1.102,768** | **3.060,024** | **3.273,185** |

La amplitud total post-cambio fue 1.781,653 ms (3,98 % de la mediana). Desaparecen exactamente **210 llamadas**, de 3.373 a 3.163. En las cinco rondas permanecen idénticos: 200 éxitos, 133 fallbacks, cero fallos, media/percentiles/máximo de candidatos y los siete conteos de rechazo (`370/49/43/27/16/10/7`).

La caída observada frente a la ejecución previa es mayor que el techo de ~1,03 s/2–3 % estimado por CPU. No se atribuye íntegramente a la optimización: procesos distintos, calentamiento del sistema y ruido local impiden esa inferencia. La aceptación se basa en trabajo eliminado y equivalencia determinista, no en ese porcentaje temporal.

### Pruebas, rollback y riesgo pendiente

Las pruebas nuevas cubren equivalencia exacta, clonación/orden de solución, errores estructurales/semánticos, cero/una/dos soluciones, truncación, `maxSolutions` insuficiente, formato desconocido, excepción de fallback, ID objetivo, pista añadida/eliminada/reordenada/modificada con el mismo ID, board/objeto, personaje, global y zona. También congelan la seed extrema `648429649`/offset 21 y demuestran que el observador cuenta solo solves reales.

Rollback: retirar el argumento `precomputed` del análisis final y volver a envolver `analyzeCase(generated)` con `measureSolver`; no hay migraciones, persistencia, versión diagnóstica, schema ni dependencia nueva.

Riesgos pendientes: el snapshot añade tres serializaciones estrictas solo al candidato procedural que alcanza la validación final; una diferencia inocua no reconocida produce un fallback seguro, nunca una reutilización permisiva. El límite finito de nodos es aceptable exclusivamente porque `truncated !== true`, `maxSolutions >= 2` y una única solución demuestran que la búsqueda terminó exhaustivamente.

### Validación final de la implementación

| Validación | Resultado exacto |
| --- | --- |
| Rama/estado inicial | `pre`; árbol limpio antes de modificar |
| Línea base calentada inmediata | 200/200 éxitos, 133 fallbacks, 0 fallos; 3.373 llamadas; 49.338 ms; 90,5 % solver; intentos media 3,40, mediana 2, P90 7, P95 10, P99 12, máximo 17; rechazos `370/49/43/27/16/10/7` |
| TypeScript / Oxlint | `npx tsc -b` y `npm run lint`: correctos, sin diagnósticos |
| Tests dirigidos | 19 archivos, 165 tests correctos, 6,34 s; incluye análisis, solver, validator, generación, observabilidad, RNG y fingerprints D1–D5 |
| Suite completa | 93 archivos, 631 tests correctos, 7,63 s |
| Auditoría de retries, 5 rondas de 20/mode+D | Cada ronda: 200/200 éxitos, 133 fallbacks, 0 fallos, 3.163 llamadas y rechazos exactos `370/49/43/27/16/10/7`; mediana 44.812,951 ms, 90,329 % solver; P50 24,091, P90 627,406, P95 1.102,768, P99 3.060,024 y máximo 3.273,185 ms |
| Reducción determinista | Exactamente 210 solves finales eliminados: 3.373 → 3.163 llamadas; casos, intentos, motivos y decisiones idénticos |
| Auditoría de pistas | 250 puzzles correctos; D1 339 ms, D2 539 ms, D3 4.367 ms, D4 16.693 ms, D5 38.317 ms; 181 fallbacks, 0 fallos, 4.249 llamadas; intentos media 3,608, mediana 2, P90 8, P95 11, P99 16, máximo 23 |
| Perfil D5 oficial | 20/20 éxitos, 0 fallos; media 796 ms, máximo 2.605 ms (caso 15); media 27,1 llamadas por solicitud, máximo 87; 91,1762 % solver; offset medio 4,2, máximo 15 |
| Casos Normal | 21 casos publicados verificados |
| Web/PWA | `verify:pwa` correcto; 458 módulos; 225 entradas y 112.873,31 KiB de precache |
| GitHub Pages | Build y verificadores PWA/Pages correctos; 458 módulos; 225 entradas y 112.876,10 KiB |
| Capacitor/Android | Build web, copia, `cap sync android` y verificador Android correctos |
| APK debug offline | Desde `android/`: `BUILD SUCCESSFUL in 15s`, 93 tareas (27 ejecutadas, 66 up-to-date); `app-debug.apk`, 120.182.104 bytes |
| Red | No utilizada; Gradle se ejecutó con `--offline` |

Avisos no bloqueantes ya presentes: chunk web minificado mayor de 500 kB; `flatDir`, desfase de versión XML del SDK y features de Gradle deprecadas antes de Gradle 9. Ninguno impidió el build o los verificadores.

## 15. Implementación de la segunda optimización Nivel A

### Comportamiento anterior y decisión de equivalencia

Antes del cambio, `hasViolatedGlobalClue` y `areAllGlobalCluesSatisfied` llamaban a `evaluateAllGlobalClues`. Esa función ejecuta un `map` eager sobre todas las pistas y crea un array más un wrapper `{ clue, evaluation }` por pista; después los consumidores booleanos aplicaban respectivamente `some` o `every` al array ya completo.

El `some`/`every` final no convertía la evaluación en short-circuit: para entonces todas las pistas habían sido evaluadas. Esto es observable con datos no admitidos por el tipo estático. Una pista no soportada situada después de una pista ya violada o no satisfecha todavía se evalúa y lanza `Unsupported global clue type: …`. Solo las pistas posteriores a la excepción quedan sin evaluar.

Se eligió por tanto un recorrido **eager sin asignaciones intermedias**, no short-circuit. Cada ruta booleana recorre `globalClues` una vez de izquierda a derecha, llama al mismo `evaluateGlobalClue` y acumula su booleano sin salir antes. Se conservan:

- ausencia de `globalClues` y array vacío: `hasViolatedGlobalClue=false`, `areAllGlobalCluesSatisfied=true`;
- mismo orden y mismo número de evaluaciones;
- misma semántica parcial/completa y triestado;
- misma excepción, incluida su aparición después de que el resultado booleano ya esté decidido;
- los cinco tipos actuales y el evaluador exhaustivo único.

`evaluateGlobalClue` y `evaluateAllGlobalClues` no cambiaron. Los consumidores detallados, incluido el sistema de pistas, siguen recibiendo exactamente el mismo array de `EvaluatedGlobalClue`. Por llamada booleana con N pistas se evitan el array de N elementos, N wrappers y el callback de `map` más el callback de `some`/`every`; no se introducen cachés, índices ni estado.

### Pruebas contractuales

Las 11 pruebas nuevas se ejecutaron primero contra la implementación anterior para caracterizar el contrato y después contra el candidato. Cubren propiedad ausente, array vacío, todas satisfechas, todas indeterminadas, violación primera/intermedia/última, primera no satisfecha en la comprobación final, placements parciales/completos, los cinco tipos globales, orden exacto, tipo no soportado al principio y después de una violación/no satisfacción, e igualdad con la ruta detallada para entradas válidas.

No se añadieron hooks de producción. Un mock temporal de test envolvió `solveCaseWithStats` solo durante la medición de la matriz y se retiró después. No se midieron bytes asignados ni presión de GC: obtener atribución fiable por helper habría requerido instrumentación más invasiva, por lo que no se inventa una cifra.

### Benchmark alternado

Se calentaron por separado baseline y candidato. En todas las rondas: 200/200 éxitos, 133 fallbacks, 0 fallos, 3.163 llamadas, intentos media 3,40/mediana 2/P90 7/P95 10/P99 12/máximo 17 y rechazos exactos `370/49/43/27/16/10/7`.

| Par | Baseline eager con `map` | Candidato eager sin wrappers | Diferencia candidato |
| ---: | ---: | ---: | ---: |
| 1 | 46.220 ms | 43.515 ms | −2.705 ms |
| 2 | 44.318 ms | 44.283 ms | −35 ms |
| 3 | 43.878 ms | 43.103 ms | −775 ms |
| 4 | 44.509 ms | 43.288 ms | −1.221 ms |
| 5 | 43.991 ms | 44.342 ms | +351 ms |
| **Mediana** | **44.318 ms** | **43.515 ms** | **−803 ms (−1,81 %)** |

El candidato fue más rápido en 4/5 pares; la diferencia pareada mediana fue −775 ms. La amplitud fue 2.342 ms (5,28 %) para baseline y 1.239 ms (2,85 %) para candidato, de modo que el tiempo sigue siendo evidencia orientativa y no un contrato.

Una sexta pareja con salida JSON registró valores exactos: baseline 46.237,209 ms total y 41.755,511 ms de solver; candidato 45.750,601 ms total y 41.297,271 ms de solver. Son −486,608 ms (−1,05 %) totales y −458,240 ms (−1,10 %) dentro del solver. El porcentaje solver fue 90,307 % frente a 90,266 %.

La instrumentación temporal de stats produjo exactamente los mismos valores en ambas variantes:

| Llamadas | Nodos | Checks de candidato | Poda dominio estático | Poda relacional | Forward-check |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 3.163 | 215.675 | 78.043.325 | 0 | 2.911.009 | 285.676 |

Esto demuestra que el cambio no altera DFS/MRV, dominios, candidatos, podas ni límites. Seeds, offsets, IDs, casos y distribución de rechazos también permanecieron idénticos.

### Fingerprints y RNG

Los fingerprints SHA-256 exactos siguen siendo:

| Dificultad | Daily | Infinite |
| ---: | --- | --- |
| 1 | `e3d6051674abd39409220038b0fd12e2114c415d50c8c1064ba0a173e9bba8cc` | `97a76fb8d7d83e6a629e9ac6d9f4f7da131f892fb15dee6d06e7c1e58458f462` |
| 2 | `475e3308b6a20a144c0c1d6e035b3663795d6f5f520a3ae98d567a11bf14155e` | `737210dc311e6bbf8fa46daba9655139e9fed7da50fc8c6ce344d7db010257ef` |
| 3 | `30e92c9673995d64f29cb382121db80c048546afc8531e0832076604b50ac6f5` | `028231d9bd49f3ffc414b9701a07dd547b8fee9f6f86038b586081977661196f` |
| 4 | `84559e895df0c3f6b10ad4f65788ec79f8da080a487aea8d37d04f22f9e5d769` | `01bece51d3f42f42c63190a107f16ee736d34a46e979bfd17738a6213dd1e621` |
| 5 | `c0e00c1d347d06b0df6f5bb7009d60d9cdcaa25c477fefa6b1af082fa22b0220` | `16546afef80cd76189aa0aeeb7d556bcebb54a2ebecf3da757f37146617e01e7` |

La prueba de observabilidad conserva exactamente cantidad y orden de valores RNG con y sin observer; los snapshots Daily/Infinite hacen round-trip byte-estructural de todos sus campos.

### Validación final, riesgo y rollback

| Validación | Resultado exacto |
| --- | --- |
| Rama/estado inicial | `pre`, `4ebeea7`; árbol limpio y sincronizado con `origin/pre` |
| TypeScript / Oxlint | Correctos, sin diagnósticos |
| Tests específicos globales | 11/11 correctos antes y después del cambio |
| Tests dirigidos | 19 archivos, 177 tests correctos, 5,86 s |
| Suite completa | 94 archivos, 642 tests correctos, 7,04 s |
| Auditoría de 250 puzzles | 250 correctos; D1 309 ms, D2 497 ms, D3 4.219 ms, D4 16.891 ms, D5 39.761 ms; 181 fallbacks, 0 fallos, 4.249 llamadas, 88,899 % solver |
| Perfil D5 | 20/20 éxitos, 0 fallos; media 797 ms, máximo 2.589 ms (caso 15); media 27,1 llamadas, máximo 87; 91,0293 % solver; offset medio 4,2, máximo 15 |
| Casos Normal | 21 casos publicados verificados |
| Web/PWA | Correcto; 458 módulos; 225 entradas y 112.873,39 KiB de precache |
| GitHub Pages | Build y verificadores correctos; 458 módulos; 225 entradas y 112.876,19 KiB |
| Capacitor/Android | Build web, copia, sync y verificador correctos |
| APK debug offline | Desde `android/`: `BUILD SUCCESSFUL in 1s`, 93 tareas (27 ejecutadas, 66 up-to-date); 120.182.129 bytes |
| Red | No utilizada; Gradle se ejecutó con `--offline` |

Riesgo residual: el beneficio temporal es pequeño y comparte escala con el ruido local, aunque aparece en 5/6 pares y elimina asignaciones demostrables por estructura. La semántica eager queda protegida por tests; añadir short-circuit en el futuro sería un cambio contractual independiente. Rollback: restaurar las dos expresiones que delegaban en `evaluateAllGlobalClues`; no hay migración, persistencia, schema, dependencia ni cambio de diagnóstico.

Próximo paso recomendado, no implementado: medir primero el Nivel A #3 —índices inmutables locales por solve para celdas, zonas, objetos y traits— con la misma exigencia de orden, excepciones, stats y fingerprints. No debe combinarse con este cambio ni introducirse sin un baseline propio.
