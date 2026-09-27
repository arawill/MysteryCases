# Observabilidad de reintentos procedurales

La observabilidad procedural es local, opcional y efímera. No existe telemetría remota, backend ni persistencia automática. Con el observador ausente, el generador sigue la ruta anterior; con él presente, conserva seeds, offsets, IDs, llamadas RNG y casos producidos.

## Formato

`ProceduralGenerationDiagnostic` vive en `src/game/generation/observability.ts`. El formato actual es `diagnosticVersion: 1` y también declara `generatorVersion`. Una observación incluye modo (`daily`, `infinite` o `procedural`), dificultad, resultado (`success`, `fallback` o `failure`), candidatos externos, intentos internos de escenario, llamadas al solver, tiempos total/solver/resto del generador, rechazos agregados, candidato aceptado y límites alcanzados.

`candidateCount` cuenta seeds efectivas probadas por el bucle exterior; `attemptCount` cuenta candidatos de escenario probados dentro de ellas. `acceptedAttempt` es uno-basado. `fallback` significa que se aceptó un offset mayor que cero. Solo `detailed: true` incluye `baseSeed`, `effectiveSeed` y `seedOffset` para reproducción.

El reloj por defecto es monotónico (`performance.now`, con `Date.now` como compatibilidad) y puede inyectarse en tests. Las excepciones del reloj y del observador se aíslan. El sobre y sus mapas/listas se congelan antes de entregarse.

Nunca se recogen narrativa, pistas, solución, progreso, saves, cuentas, identificadores de usuario ni datos personales. Las métricas son para desarrollo, tests y auditorías manuales; producción no instala observador ni escribe diagnósticos.

## Motivos de rechazo

La taxonomía tipada refleja ramas reales: invariantes de roster; layout, objetos, edge features/traits, validación y factibilidad del escenario; agotamiento de intentos de escenario; placement; escasez de pistas legibles, avanzadas o globales; límites de llamadas/nodos del solver, refinamiento y evaluación; ausencia de pista discriminante; contradicción, multiplicidad/no unicidad y divergencia canónica; validación de definición, unicidad final, análisis y culpable; calidad humana posterior; excepción controlada y agotamiento de los 100 candidatos exteriores.

Los rechazos internos del escenario se registran en su punto exacto. Las excepciones del puzzle se normalizan por el mensaje estable ya emitido por el generador. Un mensaje desconocido se clasifica como `controlled-exception`; no se expone contenido narrativo.

## Auditoría local

```text
npm run audit:procedural-retries
npm run audit:procedural-retries -- --samples=20
npm run audit:procedural-retries -- --json
npm run audit:procedural-retries -- --json --detailed
npm run audit:procedural-retries -- --json --detailed --output=reports/procedural-retries.json
npm run audit:procedural-retries -- --json --output=reports/procedural-retries.json --overwrite
```

El valor predeterminado es 5 muestras por combinación modo/dificultad: 50 solicitudes. Daily usa fechas locales fijas de 2026 (`mes = dificultad - 1`, `día = muestra + 1`, mediodía); Infinite usa una fórmula uint32 fija. El comando cubre Daily e Infinite D1–D5, funciona sin red, no toca almacenamiento ni saves y no escribe por defecto. Una ruta explícita se limita al workspace y no se sobrescribe sin `--overwrite`. Sale con 0 si todas las generaciones terminan, 1 ante fallo definitivo y 2 ante uso inválido.

Para reproducir un extremo, ejecutar con `--json --detailed`, localizar `reproduction.baseSeed` y llamar al generador del modo/dificultad indicados. Las seeds solo aparecen cuando se solicita detalle.

## Agregación e interpretación

`aggregateProceduralDiagnostics` es pura. Separa modo+dificultad y calcula solicitudes, éxitos, fallos, fallbacks, suma/media/mediana/P90/P95/P99/máximo, histograma de candidatos, rechazos, llamadas al solver y duración.

Los percentiles usan rango más próximo: sobre valores ordenados se toma `ceil(p × n)`, con índice mínimo 1. La mediana de una muestra par es la media de los dos valores centrales. En muestra vacía, conteos y totales son cero y media, mediana, percentiles, máximo y duración media son `null`; el porcentaje del solver es cero. Los tiempos sirven para perfiles comparativos, nunca para aserciones estrictas de CI.

## Línea base

La auditoría histórica anterior cubrió 340 generaciones: 231 (68 %) necesitaron reintentos, se descartaron 775 candidatos y el solver consumió aproximadamente el 89 % del tiempo. D5 llegó a 30 candidatos y 6.128 ms. Ese dataset no es idéntico al del comando actual, por lo que se comparan tendencias y causas, no porcentajes exactos.

La línea base v1 actual (`--samples=34`, 340 solicitudes, 27/09/2026) terminó 340/340: 238 fallbacks (70,0 %), media 3,46 candidatos, mediana 2, P90 7, P95 10, P99 16 y máximo 22. Hubo 5.732 llamadas al solver, que ocuparon el 89,5 % de 75.328 ms medidos. Los rechazos dominantes fueron `no-counterexample-clue` (666), `refinement-limit` (76), `candidate-evaluation-limit` (71), factibilidad de placement del escenario (43), layout (29), calidad posterior (14) y límite de nodos (11). No hubo fallos definitivos. La cercanía a 68 %/89 % respalda la medición; la diferencia corresponde al dataset actual.

Los extremos reproducibles de esa matriz fueron Daily D1 `baseSeed=648429649`, offset 21 (22 candidatos); Daily D4 `baseSeed=3324446859`, offset 16 (17); y Daily D5 `baseSeed=1592491457`, offset 16 (17). Estas seeds solo se mostraron al repetir con `--detailed`.

Una medición de overhead alternó cuatro rondas de 10 solicitudes Infinite fijas (dos por D1–D5): 40 generaciones por variante. Sin observador empleó 10.236 ms y con un observador vacío 10.033 ms (-2,0 % observado). La diferencia está dentro del ruido normal de ejecución; no indica una mejora, pero sí ausencia de coste material. La ruta desactivada no crea tracker ni consulta el reloj.

Después de cambiar generador o solver deben repetirse TypeScript, lint, pruebas de observabilidad/CLI, fingerprints D1–D5, Daily/Infinite, auditoría de 250 puzzles, esta auditoría y perfil D5. Son regresiones deterministas apropiadas: cero fallos en seeds congeladas, fingerprints, outputs/offsets/IDs, traza RNG y máximos contractuales. No deben bloquear CI pequeñas variaciones temporales.

Umbrales propuestos para seguimiento, no para bloquear CI todavía: advertir si la matriz v1 supera 80 % de fallbacks, P95 de 15 candidatos, máximo de 30 o 95 % de tiempo del solver. Sí deben fallar siempre los fallos definitivos, superar el límite contractual de 100 candidatos, cambiar fingerprints o alterar los conteos de una muestra pequeña congelada. Estos umbrales deben recalibrarse con varias ejecuciones históricas antes de promoverse a gates.
