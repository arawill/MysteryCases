# Auditoría postoptimización del solver (A1–A4)

Fecha: 28 de septiembre de 2026. Rama `pre`, commit auditado `004717acc9671877dd10dde2088cf6432b6c0835`. Esta auditoría es exclusivamente diagnóstica. No cambia solver, evaluadores, generador, límites, RNG, casos, persistencia, PWA ni Android.

## 1. Resumen ejecutivo

La línea base actual es estable y conserva todos los invariantes deterministas: 200/200 solicitudes, 133 fallbacks, 0 fallos, 679 intentos, 3.163 solves, 215.675 nodos y 78.043.325 checks. En cinco procesos limpios calentados, la mediana fue **21.501,755 ms total** y **16.636,320 ms de solver**. Las amplitudes fueron 5,04 % y 4,87 %, respectivamente.

El trabajo restante ya no contiene un recorrido accidental tan dominante como los eliminados por A3/A4. Está repartido entre:

- semántica real de pistas: 59.012.192 evaluaciones de `evaluateClueCore`;
- acceso espacial: 429.876.431 llamadas a `cellAt`;
- búsqueda/MRV/forward-check: 215.675 nodos, 1.721.282 construcciones de arrays de candidatos y 78.043.325 elementos de dominio examinados;
- estado provisional: 12.530.387 objetos `proposed` y arrays `next`;
- globales: 13.239.249 evaluaciones y 101.616.153 placements recorridos.

El perfil limpio reproduce `evaluateClueCore` (11,91 % propio), DFS (6,13 %), globales (4,30 %) y `relationValid` (5,09 % repartido en dos frames JIT). La señal nueva más clara es `cellAt`: V8 lo divide entre un frame optimizado (8,81 %) y el frame fuente (6,11 %), mientras el contador confirma 429,88 millones de consultas. Los dos frames son tiempo propio disjunto, pero los frames acumulados no se suman.

**Conclusión única:** ejecutar **un solo experimento Nivel B acotado** que sustituya, exclusivamente dentro de `createSolverEvaluationContext`, los dos `Map` de `cellAt` por una tabla densa row-major con fallback semánticamente exacto. No se recomienda implementar ahora ningún otro Nivel B. El techo muestreado es 14,92 % del total; el beneficio razonable esperado es **5–10 % total**, y el experimento solo se adopta si cinco pares alternados demuestran al menos 5 % total y 7 % de solver sin cambiar un solo conteo, resultado, excepción o fingerprint. Si no alcanza ese umbral, se revierte y se detiene la microoptimización del solver.

## 2. Entorno, alcance y método

| Elemento | Valor |
| --- | --- |
| Rama / upstream | `pre`, sin divergencia respecto de `origin/pre` al inicio |
| Commit | `004717acc9671877dd10dde2088cf6432b6c0835` |
| SO / arquitectura | Windows `win32 x64` |
| CPU | AMD Ryzen 9 7900X, 12 núcleos / 24 hilos |
| RAM | 33.487.908.864 bytes |
| Node / npm / TypeScript | 24.20.0 / 11.19.0 / 6.0.3 |
| Generador / diagnóstico | g7 / v1 |
| Dataset | 20 seeds fijas por modo y dificultad; Daily + Infinite, D1–D5; 200 solicitudes |

Se excluyó un calentamiento. Después se ejecutaron cinco procesos limpios con `node --expose-gc`, una pasada estructural separada y una pasada CPU separada. La pasada estructural añadió contadores locales a solver/evaluadores/contexto/plan/generador; su sobrecoste invalida sus tiempos como baseline, pero no sus conteos. Todos esos cambios se retiraron antes del perfil limpio y de la validación.

El perfil V8 contiene 20.628 muestras en 23.348,941 ms. La auditoría interna de ese proceso midió 21.252 ms: el perfil incluye arranque, Vite/SSR, watcher, JIT y profiler, y no sustituye la línea base. Para tiempo acumulado se contó cada muestra una sola vez por función aunque `search` aparezca recursivamente. V8 emite a veces un frame fuente y otro optimizado `(runtime)` para la misma función; sus tiempos propios son muestras disjuntas, pero sus acumulados pueden anidarse y nunca se suman.

No se publicó atribución de bytes por función. En Vite SSR los módulos transformados y frames optimizados impiden una atribución de heap fiable; la presión de asignaciones se caracteriza con contadores estructurales y el heap solo se usa para distinguir tránsito de retención.

## 3. Baseline reproducido

### 3.1 Cinco ejecuciones limpias

| Ronda | Total | Solver | P50 | P90 | P95 | P99 | Máximo | Heap antes / antes de GC / después de GC |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 21.767,397 | 16.925,780 | 20,207 | 301,098 | 470,505 | 1.305,656 | 1.332,778 | 34.969.096 / 92.282.512 / 37.084.216 |
| 2 | 21.303,293 | 16.521,197 | 20,065 | 305,944 | 473,801 | 1.242,936 | 1.345,836 | 34.952.312 / 133.886.712 / 37.071.776 |
| 3 | 21.501,755 | 16.633,493 | 20,414 | 295,709 | 477,557 | 1.232,036 | 1.331,818 | 34.964.120 / 91.597.744 / 37.342.352 |
| 4 | 22.387,985 | 17.331,751 | 22,185 | 304,986 | 488,942 | 1.277,374 | 1.415,928 | 34.962.368 / 92.352.120 / 37.076.472 |
| 5 | 21.390,095 | 16.636,320 | 21,545 | 298,203 | 459,661 | 1.251,269 | 1.402,925 | 34.960.840 / 80.716.088 / 37.083.936 |
| **Mediana** | **21.501,755** | **16.636,320** | **20,414** | **301,098** | **473,801** | **1.251,269** | **1.345,836** | **34.962.368 / 92.282.512 / 37.083.936** |

Unidades temporales: ms. La amplitud total fue 1.084,692 ms (5,04 % de la mediana); la de solver, 810,554 ms (4,87 %). El mayor heap observado justo al terminar una ronda fue 133.886.712 bytes; no es un pico continuo medido. La mediana antes de GC creció de 34.962.368 a 92.282.512 bytes y volvió a 37.083.936. Los ~2,12 MB restantes incluyen módulos/JIT/diagnósticos de Vite y son estables entre procesos; no hay evidencia de retención creciente del solve.

En las cinco rondas fueron idénticos:

| Métrica determinista | Resultado |
| --- | ---: |
| Solicitudes / éxitos / fallos | 200 / 200 / 0 |
| Fallbacks | 133 |
| Intentos | 679; media 3,395; mediana 2; P90 7; P95 10; P99 12; máximo 17 |
| Solves | 3.163 |
| Nodos / checks | 215.675 / 78.043.325 |
| Podas estáticas / relacionales / forward-check | 0 / 2.911.009 / 285.676 |
| Truncaciones | 7 |
| Rechazos | `no-counterexample-clue=370`, `refinement-limit=49`, `candidate-evaluation-limit=43`, placement=27, zonas=16, calidad=10, node-limit=7 |

### 3.2 Finalidad del solver

| Finalidad | Llamadas | Tiempo en pasada instrumentada | Media | Interpretación |
| --- | ---: | ---: | ---: | --- |
| Inicial de candidato | 679 | 13.205,645 ms | 19,449 ms | Necesaria: abre cada candidato |
| Refinamiento | 2.484 | 36.555,192 ms | 14,716 ms | Necesaria: el conjunto de pistas cambia |
| Minimización | 0 | 0 | — | Desactivada en procedural |
| Final/análisis | 0 | 0 | — | A1 reutiliza el resultado exhaustivo seguro |

Los tiempos están inflados por contadores y solo muestran reparto. Las 679+2.484 llamadas explican exactamente las 3.163 reales. El `solveCache` local no tiene oportunidad de acierto: en cada candidato la firma inicial es nueva, cada refinamiento añade una pista, no hay minimización y A1 evita el lookup final. No se justifica una caché entre solicitudes.

## 4. Impacto por modo y dificultad

Los totales y solver son medianas por fila entre cinco rondas. P50/P95/máximo pertenecen a la quinta ronda limpia y describen sus 20 solicitudes, no una garantía poblacional.

| Modo | D | Intentos | Fallbacks | Solves | Total mediano | Solver mediano | Media/solicitud | P50 | P95 | Máximo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Daily | 1 | 66 | 12 | 167 | 141,328 | 36,073 | 7,066 | 4,388 | 22,716 | 25,467 |
| Daily | 2 | 55 | 13 | 148 | 162,499 | 36,046 | 8,125 | 5,886 | 21,814 | 35,160 |
| Daily | 3 | 45 | 10 | 255 | 1.205,364 | 971,473 | 60,268 | 26,234 | 316,759 | 386,921 |
| Daily | 4 | 103 | 15 | 650 | 5.419,809 | 4.450,299 | 270,990 | 97,862 | 670,110 | 1.402,925 |
| Daily | 5 | 92 | 16 | 495 | 5.052,442 | 3.837,325 | 252,622 | 133,373 | 818,289 | 1.251,269 |
| Infinite | 1 | 65 | 14 | 156 | 109,301 | 28,391 | 5,465 | 4,192 | 9,451 | 16,432 |
| Infinite | 2 | 66 | 12 | 225 | 232,328 | 58,771 | 11,616 | 6,157 | 25,061 | 34,584 |
| Infinite | 3 | 48 | 12 | 280 | 845,217 | 608,685 | 42,261 | 22,484 | 117,821 | 243,956 |
| Infinite | 4 | 69 | 15 | 418 | 4.095,129 | 3.490,253 | 204,756 | 135,154 | 683,075 | 1.235,925 |
| Infinite | 5 | 70 | 14 | 369 | 4.245,287 | 3.211,578 | 212,264 | 77,070 | 985,985 | 1.280,818 |

D1–D2 son imperceptibles o breves; D3 suele quedar por debajo de 50 ms pero tiene colas visibles. D4–D5 dominan: en esta muestra una generación síncrona media ocupa ~205–271 ms y los extremos superan 1,2–1,4 s. Si ocurre en el hilo principal, >100 ms es bloqueo perceptible y >1 s es severo. El rendimiento central ya es aceptable, pero las colas justifican un único experimento local; si no reduce P95/P99, una UX asíncrona/progreso aportaría más valor que nuevas microoptimizaciones. Esta auditoría no cambia UX.

## 5. Perfil CPU actualizado

### 5.1 Top 15 por tiempo propio

`% solver` divide por el 77,5 % de solver observado en esa pasada y solo es una normalización aproximada para frames pertenecientes al solver.

| # | Frame V8 | Muestras | ms aprox. | % total | % solver aprox. |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `evaluateClueCore` (fuente) | 2.456 | 2.779,959 | 11,91 | 15,36 |
| 2 | `cellAt` (JIT/runtime) | 1.818 | 2.057,804 | 8,81 | 11,37 |
| 3 | `search` del solver | 1.264 | 1.430,728 | 6,13 | 7,91 |
| 4 | `cellAt` (fuente) | 1.261 | 1.427,332 | 6,11 | 7,89 |
| 5 | watcher de Vite/Node | 1.088 | 1.231,513 | 5,27 | — |
| 6 | `hasViolatedOccupancy` (JIT/runtime) | 1.014 | 1.147,752 | 4,92 | 6,34 |
| 7 | `frontier` de escenario | 890 | 1.007,396 | 4,31 | — |
| 8 | `evaluateGlobalClueCore` | 887 | 1.004,000 | 4,30 | 5,55 |
| 9 | `relationValid` (JIT/runtime) | 652 | 738,002 | 3,16 | 4,08 |
| 10 | búsqueda de placement de escenario | 628 | 710,836 | 3,04 | — |
| 11 | `hasViolatedGlobalClueWithContext` (JIT) | 521 | 589,723 | 2,53 | 3,26 |
| 12 | wrapper `evaluateClueWithContext` (JIT) | 444 | 502,566 | 2,15 | 2,78 |
| 13 | callback de ranking del generador | 400 | 452,762 | 1,94 | — |
| 14 | `relationValid` (fuente) | 399 | 451,630 | 1,93 | 2,50 |
| 15 | garbage collector | 383 | 433,520 | 1,86 | — |

Los porcentajes preliminares se reproducen en dirección y orden. La diferencia de `cellAt` (5,38 % preliminar frente a 14,92 % propio combinado ahora) procede en gran parte de que el primer perfil publicó solo el frame fuente; el nuevo muestra además el frame optimizado. Es una señal para un A/B, no una promesa de 14,92 %.

### 5.2 Top 15 por tiempo acumulado

Cada fila incluye descendientes; se deduplicó la recursión por muestra. Las filas se solapan y no se suman.

| # | Función/ruta | Muestras inclusivas | ms aprox. | % total | % solver aprox. |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | entrada `auditProceduralRetries` | 18.412 | 20.840,639 | 89,26 | — |
| 2 | `runProceduralRetryAudit` | 18.406 | 20.833,848 | 89,23 | — |
| 3 | `generatePuzzle` (Daily+Infinite) | 16.539 | 18.720,581 | 80,18 | — |
| 4 | `solveSelected` | 14.066 | 15.921,379 | 68,19 | 87,99 |
| 5 | `measureSolver` | 14.012 | 15.860,256 | 67,93 | 87,65 |
| 6 | callback `solve` | 13.992 | 15.837,618 | 67,83 | 87,52 |
| 7 | `solveCase` | 13.989 | 15.834,222 | 67,82 | 87,50 |
| 8 | `solveCaseWithStats` | 13.979 | 15.822,903 | 67,77 | 87,44 |
| 9 | DFS `search` recursivo deduplicado | 13.642 | 15.441,451 | 66,13 | 85,33 |
| 10 | `generateDailyCase` | 10.313 | 11.673,339 | 50,00 | — |
| 11 | `relationValid` (frame JIT) | 8.305 | 9.400,473 | 40,26 | 51,95 |
| 12 | `generateInfiniteCase` | 8.088 | 9.154,849 | 39,21 | — |
| 13 | `generateProceduralCase` | 8.086 | 9.152,586 | 39,20 | — |
| 14 | callback optimizado de candidatos | 7.576 | 8.575,314 | 36,73 | 47,39 |
| 15 | `candidates` | 7.493 | 8.481,366 | 36,32 | 46,87 |

### 5.3 Call tree y separación de responsabilidades

```text
audit (89,23 % acumulado)
├─ Daily / Infinite → generatePuzzle (80,18 %)
│  ├─ escenario: frontier 4,31 % propio; placement 3,04 % propio
│  └─ solveSelected (68,19 % acumulado)
│     └─ solveCaseWithStats (67,77 %)
│        ├─ construir contexto/plan (<0,2 %)
│        └─ search (66,13 %)
│           ├─ MRV → candidates
│           ├─ probar placement → forward-check → candidates
│           └─ relationValid (40,26 % en su frame JIT)
│              ├─ plan relacional → evaluateClueCore → cellAt
│              ├─ globales eager → evaluateGlobalClueCore → cellAt
│              └─ plan occupancy → evaluateClueCore → zone/trait → cellAt
└─ Vite/Node/JIT/profiler: watcher 5,27 %; GC 1,86 %; otros frames
```

Separación respaldada por perfil y contadores:

- **Solver/DFS:** 67,77 % acumulado en `solveCaseWithStats`; 66,13 % en la búsqueda.
- **Pistas:** `evaluateClueCore` 11,91 % propio y 29,49 % acumulado en su frame fuente.
- **Candidatos:** 36,32 % acumulado, pero solo ~0,61 % propio en los frames nombrados; su coste inclusivo son las restricciones que invoca.
- **MRV/forward-check:** V8 mezcla callbacks anónimos; los contadores exactos de la sección 6 son más fiables que repartir muestras por línea.
- **Globales:** núcleo 4,30 % propio; envolvente violada 8,37 % acumulado.
- **Contexto:** construcción 0,13 % propio; `cellAt` es el consumidor caliente.
- **Plan:** construcción 0,07 % propio; recorridos occupancy y relación aparecen repartidos en frames fuente/JIT (~6,21 % y ~2,58 % propios, respectivamente).
- **Generador:** `frontier` 4,31 %, placement 3,04 %, `generatePuzzle` 1,67 % propios; ranking/callback 1,94 %.
- **Observabilidad:** `measureSolver` tiene coste propio inferior a 0,01 %; su acumulado es el trabajo que envuelve.
- **Runtime:** watcher 5,27 %, GC 1,86 %; no son lógica de reglas.

### 5.4 Síntesis de hotspots, necesidad e invariantes

| Hotspot | Invocaciones/datos | Propio / acumulado | Necesario frente a accidental | Invariantes que no deben romperse |
| --- | --- | --- | --- | --- |
| `evaluateClueCore` | 59.012.192; 344.290.528 placements lógicos | 11,91 % / 29,49 % | Necesario: reglas y estado parcial. Accidental: scans, closures y lookups repetidos | Los 30 tipos, `undetermined`, orden y excepción exhaustiva |
| `cellAt` | 429.876.431; 327.751 posiciones distintas por contexto sumadas | 14,92 % propio en dos frames; 14,84 % acumulado en el frame JIT | Necesario: resolver coordenada. Accidental: dos `Map.get` por consulta repetida | Primera celda duplicada, `undefined`, datos malformados, aislamiento solve-local |
| DFS `search` | 215.675 nodos; 498.195 placements probados | 6,13 % / 66,13 % | Necesario: backtracking, soluciones y límites | Orden de soluciones, `maxSolutions`, `maxNodes`, truncación y stats |
| `candidates` | 1.721.282 arrays; 78.043.325 checks | ~0,61 % propio nombrado / 36,32 % | Necesario: probar restricciones. Accidental: materialización completa en forward | Orden de dominio, evaluación eager, excepciones y podas |
| MRV | 209.573 rankings; 814.583 comparaciones | Mezclado en `search`; sin hotspot propio aislable | Necesario: elegir dominio mínimo. Accidental: sort completo de ≤10 | Primer empate, recorrido y límites |
| Forward-check | 1.047.063 dominios; 49.009.896 checks | Mezclado en callbacks; parte del acumulado de candidatos | Necesario: detectar vacío. Accidental: guardar 4.880.628 refs | Mismos checks/podas si eager; no ocultar excepciones |
| `relationValid` | 12.530.387; 66.952.235 refs copiadas a `next` | 5,09 % propio en dos frames / 40,26 % en frame JIT | Necesario: estado provisional y tres fases. Accidental: arrays/objetos/closures | Relación→global eager→occupancy, short-circuit y duplicados |
| Globales | 13.239.249; 101.616.153 placements | 4,30 % núcleo / 8,37 % envolvente | Necesario: cinco reglas actuales. Accidental: filtros y `cellAt` reiterado | Eager, parciales/completas, tipo no soportado |
| Plan de pistas | 3.163 builds; recorridos calientes por callback | Build 0,07 %; occupancy/relación repartidos ~6,21/~2,58 % propios | Build necesario y barato; presencia por `next.some` repetida | Orden, duplicados, owner colocado y short-circuit |
| Contexto indexado | 3.163 builds | Build 0,13 %; consumo `cellAt` arriba | Build necesario y barato; representación interna mejorable | Inmutabilidad local y primeras coincidencias |
| Generador/observabilidad | 200 solicitudes; 679 candidatos | Hotspots de escenario 4,31 %+3,04 %; observabilidad <0,01 % propio | Generación necesaria; timer no es problema | RNG, seeds, offsets, IDs y aislamiento del observer |

## 6. Conteos estructurales y asignaciones

### 6.1 Candidatos, MRV y forward-check

| Ruta | Arrays de candidatos | Elementos de dominio evaluados | Referencias guardadas en resultados | Longitud máxima dominio / resultado |
| --- | ---: | ---: | ---: | ---: |
| MRV | 674.219 | 29.033.429 | 4.738.750 | 96 / 96 |
| Forward-check | 1.047.063 | 49.009.896 | 4.880.628 | 96 / 80 |
| **Total** | **1.721.282** | **78.043.325** | **9.619.378** | **96 / 96** |

MRV creó 209.573 arrays de ranking, 674.219 objetos de ranking y ordenó 209.573 veces; realizó 814.583 comparaciones, solo 3,89 por sort de media, con máximo 10 personajes. Cada ranking crea además el array de `filter` de no colocados y el array de `map`.

Forward-check creó 498.195 arrays de personajes no colocados con 1.178.317 referencias. Probó 1.047.063 personajes y encontró 285.676 dominios vacíos que detuvieron el `some`. En esta ruta solo interesa existencia, pero `candidates().filter()` evalúa el dominio completo y materializa el array. Sustituir el array por un booleano **eager** preservaría checks, excepciones y orden; usar `some` sobre el dominio eliminaría evaluaciones y cambiaría stats/short-circuit. Son cambios distintos.

No puede reutilizarse sin más el array MRV durante forward-check: entre ambos se inserta un placement, cambian fila/columna, relaciones, globales y occupancy. Una caché correcta necesitaría invalidación por estado.

### 6.2 Placements y estado dinámico

| Estructura/operación | Cantidad |
| --- | ---: |
| Llamadas `relationValid` | 12.530.387 |
| Objetos `proposed` y objetos de posición | 12.530.387 de cada uno |
| Arrays `next` | 12.530.387 |
| Referencias copiadas a `next` | 66.952.235 |
| Placements DFS insertados/retirados | 498.195 |
| Búsquedas `placementFor` | 72.276.072 llamadas / 267.905.480 elementos recorridos / 67.920.700 hits |
| Presencia para plan occupancy | 93.451.976 llamadas / 352.119.170 placements recorridos |
| `zoneOccupancy` | 41.013.696 llamadas / 251.384.119 placements recorridos |
| `companionsWithTrait` | 1.591.947 llamadas / 10.505.000 placements recorridos |
| Clones de placements de soluciones | 52.353 |

`next` es necesario para presentar el estado provisional a los evaluadores actuales; su array y `proposed` son transitorios. El mapa `positions` ya existente solo contiene placements confirmados, no el propuesto, y reproduce semántica de ID distinta a un escaneo de `next` con duplicados. Reutilizarlo exige un overlay de inserción/rollback o un lector explícito que preserve primera coincidencia.

Un índice dinámico de occupancy podría eliminar cientos de millones de recorridos, pero requiere actualizar por cada push: zona, objeto, superficie, trait y personaje; después revertir exactamente todos los contadores antes del siguiente candidato. Debe soportar IDs/posiciones duplicados y entradas malformadas igual que hoy. Es una superficie mayor que el experimento recomendado.

### 6.3 `evaluateClueCore` por familia

| Familia | Evaluaciones | % de 59.012.192 | Trabajo dominante |
| --- | ---: | ---: | --- |
| Occupancy de zona | 41.013.696 | 69,50 % | Escaneo completo de placements y `cellAt` |
| Relacionales | 13.263.880 | 22,48 % | Lookup de sujeto/target, geometría y relaciones |
| Traits/compañeros | 1.591.947 | 2,70 % | Placements, `cellAt` y set de traits |
| Estáticas | 1.258.010 | 2,13 % | Comparación de fila/columna/zona/lista |
| Edge/espaciales | 1.171.164 | 1,98 % | Helpers vecinos/corner/wall/feature |
| Objetos | 713.495 | 1,21 % | Objetos indexados y predicados espaciales |
| Superficies | 0 | 0 % | No aparece en esta matriz |

Por tipo destacan `ownZoneOccupancyCount=38.080.120`, `aloneInZone=2.922.282`, `southOfCharacter=5.515.636`, `northOfCharacter=5.385.199`, `sameZoneAsCharacter=1.880.031`, `withTraitInZone=949.922` y `cornerOfZone=248.770`. Las evaluaciones vieron en conjunto 344.290.528 placements de longitud lógica.

La señal no apunta al dispatch del `switch` como coste independiente: el perfil atribuye 11,91 % propio al núcleo completo, que incluye comparaciones, helpers inlinados y dispatch. La mayor parte del volumen es lógica real de occupancy/relación. Sí hay presión accidental:

- cuatro callbacks creados por `relationValid` (50.121.548 closures estructurales);
- hasta 93.451.976 callbacks internos de `next.some` para presencia occupancy;
- arrays de `zoneOccupancy`/compañeros producidos por `filter`;
- búsquedas repetidas de placements y posiciones.

Precompilar pistas podría beneficiar como máximo las 59,01 M evaluaciones, pero el 69,5 % seguiría escaneando occupancy y el 22,5 % seguiría resolviendo dos sujetos. Sin un prototipo que separe dispatch de semántica no se atribuye al `switch` el 11,91 % completo.

### 6.4 `cellAt`

La matriz hizo **429.876.431** consultas. Sumando las posiciones distintas dentro de cada uno de los 3.163 contextos solo hubo **327.751** (`0,076 %` del volumen de llamadas); la repetición es legítima y extrema. El diseño actual evita construir claves string: hace `cellsByRow.get(row)?.get(column)`. El coste restante son dos lookups `Map`, llamada de closure y acceso opcional.

Consumidores cuantificados: occupancy local 251,38 M recorridos, globales 101,62 M, traits 10,51 M y lookups sujeto/target dentro de 59,01 M evaluaciones. Helpers espaciales añaden consultas vecinas. El perfil divide tiempo propio de `cellAt` en 8,81 %+6,11 %. Una tabla row-major evita ambos `Map.get`; una clave string o memo por posición añadiría hashing/asignaciones y no es preferible.

### 6.5 Globales

| Tipo | Evaluaciones | Placements/zonas relevantes | Peso por dificultad |
| --- | ---: | --- | --- |
| `emptyZoneCount` | 1.769.567 | 7.078.268 zonas; cada una recorre placements | D4 1.470.897; D5 298.325; D1–D3 345 |
| `zoneOccupancyCount` | 4.730.535 | Un recorrido de placements | D4 2.891.091; D5 1.838.064; D1–D3 1.380 |
| `objectOccupancyCount` | 2.904.169 | Un recorrido y `cellAt` por placement | D4 1.205.768; D5 1.697.768; D1–D3 633 |
| `zoneTraitCount` | 3.834.978 | Recorrido, `cellAt` y set de trait | Exclusivo de D5 en esta matriz |
| `surfaceOccupancyCount` | 0 | Ninguno en esta matriz | Sin evidencia temporal aquí |

Total: 13.239.249 evaluaciones, 13.111.223 parciales y 128.026 completas; 101.616.153 placements recorridos. D4 aporta 5.567.756 (42,05 %) y D5 7.669.135 (57,93 %); D1–D3 juntos son despreciables. El 4,30 % propio del núcleo no justifica aislar globales antes de `cellAt`: gran parte de su trabajo es el mismo lookup espacial. La evaluación eager es contractual para conservar excepciones posteriores.

### 6.6 Contexto, plan y presión transitoria

La pasada instrumentada cronometró 3.163 contextos en 41,333 ms y 3.163 planes en 26,986 ms. Son cotas infladas por contadores: 0,075 % y 0,049 % de esa pasada. El perfil limpio muestreó 0,126 % propio en el constructor del contexto y 0,073 % en el plan. Las mediciones específicas anteriores (25,718 y 22,414 ms) concuerdan en que construirlos no es el problema.

Asignaciones transitorias conocidas, sin inventar bytes:

- 1.721.282 arrays de candidatos y 9.619.378 referencias resultantes;
- al menos 419.146 arrays MRV y 674.219 objetos de ranking;
- 498.195 arrays forward de no colocados;
- 12.530.387 arrays `next`, objetos `proposed` y posiciones;
- 498.195 placements DFS con posición;
- 52.353 clones de solución con posición;
- callbacks calientes descritos arriba;
- mapas/sets/arrays del contexto y plan solo 3.163 veces.

El 1,86 % de muestras de GC y la vuelta estable a ~37,08 MB tras GC confirman presión transitoria, no retención. El pico variable anterior a GC no permite asignar bytes a una familia.

## 7. Evolución histórica A0–A4

| Estado | Evidencia temporal | Trabajo estructural eliminado | Validez de comparación |
| --- | --- | --- | --- |
| A0 original | Mediana 48.101 ms; 90,5 % solver; 3.373 solves | Ninguno | Baseline histórico local, no pareado con hoy |
| A1 | Mediana 44.812,951 ms; 90,329 % solver; 3.163 solves | 210 resoluciones finales seguras | Conteo causal exacto; tiempo histórico aproximado |
| A2 | Pareado 44.318 → 43.515 ms (−1,81 %) | Arrays de wrappers globales; eager preservado | 5 pares; señal pequeña y ruidosa |
| A3 | Pareado 44.078,387/39.872,072 → 26.907,778/22.681,143 ms | Búsquedas lineales estáticas sustituidas por contexto indexado | 5/5 pares; −38,95 % total, −43,11 % solver |
| A4 | Pareado 29.595,781/24.855,377 → 20.920,789/16.266,337 ms | Clasificaciones relacionales/occupancy repetidas | 5/5 pares; −29,31 % total, −34,56 % solver |
| Actual | 21.501,755/16.636,320 ms medianos | Ninguno adicional | 5 procesos limpios post-A4 |

Los conteos actuales siguen siendo exactamente 3.163 solves, 215.675 nodos, 78.043.325 checks y las mismas podas/rechazos. A1 tiene causalidad estructural aunque su ahorro temporal sea ruidoso. A2–A4 solo deben interpretarse mediante sus pares internos: el baseline A3 de la campaña A4 (29,596 s) no contradice la mediana A3 previa (26,908 s); son periodos térmicos distintos. Comparar A0 (48,101 s) con hoy (21,502 s) sugiere una reducción observada de ~55 %, pero no permite repartir toda la diferencia entre cambios sin usar los benchmarks pareados.

## 8. Matriz de candidatos Nivel B

### 8.1 Trabajo, techo y recomendación

| # | Candidato | Trabajo exacto que podría eliminar | Techo observado | Recomendación |
| ---: | --- | --- | --- | --- |
| 1 | Booleano forward sin array | 1.047.063 arrays y 4.880.628 referencias. Variante eager no elimina checks; variante short-circuit sí reduce parte de 49.009.896 | Propio de candidatos bajo + GC 1,86 %; <3 % total para variante eager | **Investigar**, no mezclar con #4 |
| 2 | Reusar candidatos MRV/forward | Parte de 1.047.063 reconstrucciones | Inclusivo `candidates` 36,32 %, pero el estado cambia antes de forward | **Descartar ahora**: caché quedaría obsoleta |
| 3 | MRV sin sort completo | 209.573 sorts y 814.583 comparaciones; puede conservar primer empate | Máximo 10 entradas; no aparece como hotspot propio | **Investigar solo después**; probable <1 % |
| 4 | `cellAt` row-major directo | Dos `Map.get` en 429.876.431 consultas | 14,92 % propio combinado; razonable 5–10 % total | **Adoptar únicamente como experimento B acotado** |
| 5 | Usar `positions` en evaluadores | Hasta 267.905.480 pasos de `placementFor` | Parte inlinada en `evaluateClueCore`; techo no aislado | **Investigar**, exige overlay de `proposed` |
| 6 | Índices occupancy con backtracking | Hasta 251.384.119 recorridos locales + 101.616.153 globales | Alto estructural, sin tiempo aislado | **Investigar**, no implementar aún |
| 7 | Precompilar pistas | Dispatch/closures de hasta 59.012.192 evaluaciones | `evaluateClueCore` 11,91 % propio, pero 92 % son occupancy/relaciones reales | **Descartar ahora** sin separación de dispatch |
| 8 | Memoizar dominios/estados | Repeticiones hipotéticas de candidatos | 0 estados repetidos demostrados; DFS fijo no converge al mismo estado | **Descartar** |
| 9 | Cachés entre candidatos/solicitudes | Solves o evaluaciones idénticas hipotéticas | 0 hits: firmas crecen; no hay min/final; auditoría histórica tampoco halló equivalentes | **Descartar explícitamente** |

### 8.2 Riesgo, memoria, superficie y pruebas

| # | Riesgo funcional / determinismo / excepciones | Memoria y complejidad | Archivos/superficie | Pruebas y rollback |
| ---: | --- | --- | --- | --- |
| 1 | Eager: bajo y mismo recorrido; short-circuit: medio, cambia checks/podas y puede ocultar excepción posterior | Menos memoria; baja/media | `solver.ts` | Stats exactos, pistas no soportadas tardías, maxNodes, orden; rollback trivial |
| 2 | Alto: filas/columnas/globales/occupancy cambian; stale cache altera MRV y soluciones | Cache + invalidación; alta | Solver/estado dinámico | Traza nodo a nodo y fingerprints; rollback medio |
| 3 | Bajo si el mínimo conserva primer índice; cualquier empate distinto altera DFS/maxNodes | Menos objetos opcional; baja | `solver.ts` | Empates, 0/1/2 soluciones, truncación, stats; rollback trivial |
| 4 | Medio: preservar primera celda duplicada, coordenadas no enteras/ausentes, `undefined`, mutación pública y fallback | Array `rows*columns` por solve + fallback; media | `solverEvaluationContext.ts` y tests de contexto/indexado | Equivalencia de 30+5 tipos, duplicados/malformed, mutaciones, stats/orden/fingerprints; rollback trivial (un módulo) |
| 5 | Medio-alto: primera coincidencia e ID duplicado; el propuesto aún no está en `positions` | Overlay/lector dinámico; media | Solver, contexto, clues/globales | Duplicados, owner/target, proposed, backtracking; rollback medio |
| 6 | Alto: inserción y rollback deben ser atómicos; un contador stale cambia podas/orden | Maps/sets dinámicos; alta | Solver + todos los evaluadores occupancy/global | Equivalencia por cada push/pop, excepciones, truncación, fuzz y fingerprints; rollback difícil |
| 7 | Medio-alto: closures capturan datos; orden/eager/exhaustive deben ser idénticos | Más closures/memoria por plan; alta | Plan, clues, globales | Todos los tipos, unsupported tardío, duplicados y mutación; rollback medio |
| 8 | Alto: clave completa incluye placements ordenados, opciones y stats | Memoria no acotada/hashing; alta | Solver | Colisiones, mutación, maxNodes/maxSolutions, stats; rollback medio |
| 9 | Alto entre solicitudes: casos mutables, opciones y excepciones; puede retener grafos | Memoria persistente sin hits; alta | Generador/solver | Identidad/estructura, seeds, límites, eviction; rollback medio |

## 9. Experimento B recomendado y criterio de salida

El único siguiente paso es un experimento aislado en `solverEvaluationContext.ts`:

1. Mantener sin cambios la interfaz `cellAt(position)` y todos sus consumidores.
2. Construir una tabla densa row-major local al solve para coordenadas enteras dentro de `rows × columns`, insertando solo la primera celda de cada coordenada.
3. Mantener el índice actual como fallback para coordenadas no enteras, fuera de rango, dimensiones incoherentes y fixtures malformados. No crear claves string por consulta.
4. No tocar solver, MRV, forward-check, pistas, globales, plan, RNG, límites ni stats.
5. Añadir equivalencia dirigida: duplicados de coordenada, primera coincidencia, posiciones desconocidas, rows/columns extrañas, board mutable entre contextos pero no dentro del solve, 30 tipos locales y 5 globales.
6. Ejecutar cinco pares alternados A4/control contra candidato, cada uno con calentamiento excluido y GC: total, solver, percentiles, heap y los conteos exactos de esta auditoría.

Criterio de adopción: ganar en 5/5 pares, mediana pareada de al menos **5 % total y 7 % solver**, sin empeorar P95/P99 más de ruido, sin aumentar retención post-GC materialmente y con identidad exacta de soluciones ordenadas, stats, truncaciones, rechazos, seeds, offsets, IDs, RNG, snapshots y fingerprints. El techo absoluto es 14,92 % total porque no puede ahorrar más que todo el tiempo propio atribuido a ambos frames `cellAt`; el rango defendible es 5–10 %. Si no cumple, se revierte el módulo y se detiene la microoptimización del solver.

## 10. Validación del estado de referencia

| Validación | Resultado |
| --- | --- |
| TypeScript / Oxlint | Correctos, sin diagnósticos |
| Suite completa | 97 archivos, 659 tests, 7,93 s |
| Fingerprints D1–D5 / RNG / snapshots | Tests exactos correctos; hashes g7 sin cambios |
| Auditoría final 200 | 200/200, 133 fallbacks, 0 fallos, 679 intentos, 3.163 solves; 20.864 ms; 77,7 % solver |
| Calidad procedural | 250/250; D1 326, D2 516, D3 2.597, D4 8.073, D5 16.345 ms; 181 fallbacks; 4.249 solves; 0 fallos |
| Perfil D5 | 20/20; media 388 ms; máximo 1.285 ms (caso 15); 27,1 solves de media, máximo 87; 77,6006 % solver |
| Normal | 21 casos publicados correctos |
| Web/PWA | 460 módulos; 225 entradas; 112.875,71 KiB; verificador correcto |
| GitHub Pages | 460 módulos; 225 entradas; 112.878,50 KiB; verificadores correctos |
| Capacitor/Android | Build, copia, sync y verificador correctos |
| APK debug offline | `BUILD SUCCESSFUL in 15s`; 93 tareas; 120.182.924 bytes; `--offline` |
| `git diff --check` | Correcto; solo avisos EOL conocidos en archivos generados sin diff material |
| Red | No utilizada |

La instrumentación temporal consistió en un harness de cinco rondas/heap, contadores en solver/evaluadores/contexto/plan/generador, un `.cpuprofile` y un parser local. Se eliminaron el módulo, harness, parser, perfil y directorio temporal antes de validar. Los cuatro archivos de producción tocados temporalmente quedaron con el mismo objeto Git que `HEAD`; los builds de Capacitor tampoco dejaron diff.

## 11. Riesgos y conclusión

Los riesgos principales de cualquier Nivel B son romper primera coincidencia con datos duplicados, cambiar evaluación eager/excepciones, alterar desempates MRV, cambiar stats usados en auditoría o dejar índices dinámicos stale al retroceder. El experimento elegido evita los cuatro últimos: solo sustituye la representación estática detrás de una interfaz existente y conserva fallback.

**Decisión: un único experimento Nivel B claramente delimitado —`cellAt` row-major solve-local con fallback exacto y umbral de adopción 5 % total / 7 % solver.** No se autoriza encadenar candidatos. Si no supera ese gate, la recomendación es no continuar optimizando el solver y tratar la cola perceptible en la UX en una tarea separada.
