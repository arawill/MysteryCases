# Auditoría técnica de Daily, Infinite y generación procedural

Fecha: 23 de septiembre de 2026.

Rama auditada: `pre`.

Estado inicial: árbol de trabajo limpio.

Alcance inicial: análisis, pruebas y documentación; no se modificó código de producción, tests, configuración, dependencias ni scripts permanentes.

Actualización de endurecimiento: 24 de septiembre de 2026. La línea base y sus mediciones históricas se conservan debajo; el estado posterior se resume primero.

## Estado posterior al endurecimiento

Los dos riesgos ALTOS quedaron resueltos sin modificar el algoritmo procedural, su distribución, la dificultad ni los casos Normal C01–C15.

### Arquitectura aplicada

```text
Generación procedural
  → validación compartida
  → ProceduralCaseSnapshot V1 (JSON puro, assets por ID estable)
  → envelope de sesión V2
  → restauración sin generador
  → hidratación de assets
  → validación defensiva compartida
  → GameCase + CaseSave V4
```

- `daily/date.ts` centraliza la fecha civil local y la seed. La clave no depende de locale, UTC, usuario ni cuenta.
- `daily/rollover.ts` programa la próxima medianoche local, revalida al recuperar foco/visibilidad, deduplica cambios y limpia listeners/timer.
- `DailyScreen` conserva el `dateKey` y snapshot de una partida activa. Una pantalla previa adopta la fecha nueva; abandonar y volver ofrece el Daily actual.
- `proceduralSnapshot.ts` persiste seed original/efectiva, offset, modo, dificultad, fecha Daily, versión del generador, versión del formato, pack, culpable, estadísticas y el caso completo.
- Las URLs del bundle se sustituyen por IDs de assets estables. La hidratación exige que todos existan y vuelve a construir el `GameCase`.
- Daily e Infinite V2 restauran exclusivamente el snapshot. Los tests inyectan un generador que lanza para demostrar que no se invoca.
- Las sesiones V1 se detectan explícitamente, se reconstruyen una vez con la información disponible, se validan y se sobrescriben inmediatamente como V2. Si la reconstrucción o escritura no es segura, la metadata legacy se elimina conservadoramente.
- El progreso mutable continúa en `CaseSave V4`; no se duplica dentro del snapshot inmutable. Infinite conserva `status` en su envelope.

La validación compartida reutiliza `validateCaseDefinition()`, calidad procedural, solver, coincidencia canónica y culpable. Un snapshot incoherente se rechaza sin crash.

### Contrato temporal confirmado

Daily usa los componentes locales `getFullYear/getMonth/getDate` y formato `YYYY-MM-DD`. El ordinal civil conserva exactamente la seed histórica sin emplear UTC para decidir el día. Para fecha+dificultad, la identidad es estable; no contiene información del usuario. El cambio ocurre a medianoche local del dispositivo.

Una sesión activa no cambia a medianoche. El timer solo actualiza la oferta de pantallas previas; foco y `visibilitychange` cubren la reanudación tras suspensión. La misma implementación React/web se empaqueta en PWA y Capacitor Android.

### Versiones y tamaño

- Envelope Daily/Infinite: `saveVersion: 2`.
- Snapshot: `PROCEDURAL_SNAPSHOT_FORMAT_VERSION = 1`.
- Generador actual: `PROCEDURAL_GENERATION_VERSION = 7`.
- El snapshot medido ocupa entre 7.533 y 17.095 bytes en la muestra fija D1–D5 de ambos modos.

Debe incrementarse la versión del generador si la misma entrada puede cambiar de salida. Debe incrementarse la versión de snapshot si cambia de forma incompatible la representación persistida o su decoder. Los IDs/rutas de assets persistibles son un ABI: un asset existente no se reasigna ni sobrescribe; los nuevos reciben identidad nueva.

El contrato técnico completo está en `docs/procedural-persistence.md`.

### Estado de hallazgos

| Hallazgo | Estado posterior | Evidencia |
| --- | --- | --- |
| ALTO-1, rollover Daily | Resuelto | reloj inyectable, medianoche, foco, visibilidad, cleanup y sesión fijada cubiertos por tests |
| ALTO-2, restauración entre versiones | Resuelto para sesiones V2 | snapshot completo; carga V2 no llama al generador; V1 migra una vez |
| MEDIO-1, política temporal no definida | Resuelto por decisión de producto | fecha local del dispositivo, sin identidad de usuario |
| MEDIO-2, excepciones de reintentos sin causa | Pendiente | fuera del endurecimiento de lifecycle/persistencia; no afecta outputs aceptados |
| MEDIO-3, E2E offline PWA/Android | Parcial | build, empaquetado y lógica compartida verificados; sigue sin prueba automatizada sobre PWA instalada/WebView real |
| BAJO-1, repetición histórica Infinite | Pendiente | se conserva deliberadamente la semántica aleatoria actual |
| BAJO-2, retención de saves antiguos | Pendiente | no se añadió una política destructiva sin decisión de retención |

### Evidencia de no regresión

Antes de modificar producción se capturaron diez fingerprints SHA-256 de la estructura completa generada, D1–D5 para Daily e Infinite. `proceduralFingerprint.test.ts` conserva esas referencias y todas coinciden después del endurecimiento. Esto demuestra que el cambio de seed civil y la nueva persistencia no alteraron el output `g7` de la muestra fija.

| Modo | D | Entrada | Offset | SHA-256 antes = después |
| --- | ---: | --- | ---: | --- |
| Daily | 1 | `2026-01-01`, seed 3394289277 | 0 | `e3d6051674abd39409220038b0fd12e2114c415d50c8c1064ba0a173e9bba8cc` |
| Daily | 2 | `2026-01-02`, seed 2767661968 | 0 | `475e3308b6a20a144c0c1d6e035b3663795d6f5f520a3ae98d567a11bf14155e` |
| Daily | 3 | `2026-01-03`, seed 3781566194 | 4 | `30e92c9673995d64f29cb382121db80c048546afc8531e0832076604b50ac6f5` |
| Daily | 4 | `2026-01-04`, seed 500503124 | 4 | `84559e895df0c3f6b10ad4f65788ec79f8da080a487aea8d37d04f22f9e5d769` |
| Daily | 5 | `2026-01-05`, seed 1514407350 | 4 | `c0e00c1d347d06b0df6f5bb7009d60d9cdcaa25c477fefa6b1af082fa22b0220` |
| Infinite | 1 | seed 287387969 | 0 | `97a76fb8d7d83e6a629e9ac6d9f4f7da131f892fb15dee6d06e7c1e58458f462` |
| Infinite | 2 | seed 304230978 | 2 | `737210dc311e6bbf8fa46daba9655139e9fed7da50fc8c6ce344d7db010257ef` |
| Infinite | 3 | seed 321073987 | 1 | `028231d9bd49f3ffc414b9701a07dd547b8fee9f6f86038b586081977661196f` |
| Infinite | 4 | seed 337916996 | 1 | `01bece51d3f42f42c63190a107f16ee736d34a46e979bfd17738a6213dd1e621` |
| Infinite | 5 | seed 354760005 | 3 | `16546afef80cd76189aa0aeeb7d556bcebb54a2ebecf3da757f37146617e01e7` |

La batería dirigida posterior cubrió 15 archivos y 141 tests: fecha, rollover, snapshots, migraciones, Daily, Infinite, generador, solver, validator, `CaseSave V4` y reset.

### Matriz final posterior

- `npx tsc -b`: correcto, sin diagnósticos.
- `npm run lint`: correcto, sin diagnósticos.
- Tests nuevos de fecha, rollover, snapshot, migración y fingerprints: correctos.
- Suite dirigida: 15 archivos, 141 tests correctos en 6,55 s.
- `npx vitest run`: 86 archivos, 589 tests correctos en 7,84 s.
- `npm run verify:clue-quality`: 250 puzzles correctos; 50 por D1–D5.
- `npm run profile:d5 -- --samples=20`: 20 éxitos, 0 fallos; media 850 ms, máximo 2.638 ms.
- `npm run verify:normal-cases`: 21 casos Normal publicados correctos.
- Muestra reproducible D1–D5 de ambos modos: diez fingerprints antes=después correctos.
- `npm run build`: correcto; 450 módulos transformados, 225 entradas PWA y 112.857,46 KiB de precache.
- `npm run verify:pwa`: correcto.
- `npm run verify:pages`: build Pages y verificadores PWA/Pages correctos; 225 entradas y 112.860,25 KiB de precache.
- `npm run verify:android`: build, `cap sync android` y verificador Android correctos.
- `android\\gradlew.bat assembleDebug --offline`: `BUILD SUCCESSFUL` en 17 s; 93 tareas, 27 ejecutadas y 66 `up-to-date`; APK debug de 120.176.160 bytes.
- `git diff --check`: correcto; únicamente avisos locales de futura conversión LF→CRLF.
- Rama final: `pre`; cambios sin commit.
- Diff de C01–C15, narrativas, schema y datos Normal: vacío.

Avisos no bloqueantes: el chunk principal supera 500 kB; Gradle mantiene `flatDir`, APIs deprecadas y una advertencia de versión XML del SDK. No se descargaron dependencias ni se utilizó la red.

## Línea base de la auditoría (antes del endurecimiento)

Daily e Infinite producen `GameCase` válidos mediante generación procedural y permanecen separados del loader JSON de los casos Normal manuales. Ambos reutilizan el mismo catálogo local de escenarios, roster, generador de tablero, generador de pistas, solver y validadores. Normal no genera casos en vivo: consume casos manuales o descriptores procedurales congelados.

La muestra temporal de auditoría generó 500 casos, 50 por dificultad y por modo. Cada resultado se volvió a generar con la misma entrada y se comparó estructuralmente. No hubo excepciones finales, casos inválidos, soluciones inexistentes o múltiples, divergencias deterministas, colisiones internas, IDs de caso repetidos, estructuras completas repetidas ni referencias de assets vacías o remotas. La herramienta oficial adicional verificó otros 250 puzzles procedurales.

Esto es evidencia empírica amplia, no una demostración matemática para las 2³² semillas. Las garantías estructurales más importantes sí se aplican dentro del generador: validación de definición, solver limitado a dos soluciones, coincidencia con la solución canónica, análisis independiente y asesino único.

No se encontró ningún hallazgo CRÍTICO. Se encontraron dos riesgos ALTOS:

1. Una pantalla Daily que permanece montada durante el cambio de día no tiene una política coherente de rollover. Puede conservar el día anterior indefinidamente o cambiar al caso nuevo durante un rerender manteniendo en memoria la sesión anterior.
2. Las sesiones no pueden reconstruir necesariamente el mismo caso después de una actualización del generador. Daily no guarda versión ni semilla efectiva; Infinite guarda `generationVersion: 1`, pero este valor no está conectado a `PROCEDURAL_GENERATION_VERSION = 7` ni selecciona un generador histórico.

## 1. Mapa arquitectónico real

### Daily

```text
App / ruta #/daily
  → HomeScreen / DailyCaseCard
  → DailyScreen
      → new Date() del dispositivo
      → loadDailySession(date)
      → startDailySession(date, difficulty, normalProgress)
      → getCachedDailyCase(date, difficulty)
          → getDailyDateKey / getDailyDifficultySeed
          → selectScenarioPack(baseSeed)
          → buildCharacterRoster(difficulty, baseSeed, pack)
          → createDifficultyScenarioProfile
          → generateScenarioTemplate(effectiveSeed)
              → layout de zonas
              → colocación de objetos
              → edge features D4–D5
              → traits D5
              → validación de plantilla y placement de viabilidad
          → generatePuzzle(effectiveSeed)
              → placement canónico con asesino único
              → pool de pistas verdaderas
              → selección por dificultad y legibilidad
              → solveCase(maxSolutions: 2, maxNodes: 4000)
              → validateCaseDefinition
              → comprobación final de unicidad y analyzeCase
          → hasReadableClues
          → GameCase con ID daily-AAAA-MM-DD-dN-g7
      → GameScreen
          → CaseSave V4 bajo el ID versionado del GameCase
          → completionId lógico daily-AAAA-MM-DD
          → Progress + InvestigationHistory + logros
```

Puntos de entrada: `App.tsx:63`, `HomeScreen.tsx:17-30` y `DailyScreen.tsx:17-23`. El generador específico está en `game/daily/generator.ts:16-33`; la fecha y semillas, en `game/daily/date.ts:2-7`; la sesión, en `game/persistence/dailySession.ts:5-8`.

Daily no llama a `generateProceduralCase`, pero reproduce deliberadamente la misma composición de etapas. Su filtro `hasReadableClues` es un alias semántico de `validateHumanClueQuality(...).length === 0`.

### Infinite

```text
App / ruta #/infinite
  → HomeScreen / InfiniteModeCard
  → InfiniteScreen
      → loadInfiniteSession()
      → createInfiniteSeed()
          → crypto.getRandomValues(Uint32Array)
      → startInfiniteSession(difficulty, seed, normalProgress)
      → getCachedInfiniteCase({ difficulty, seed })
          → generateInfiniteCase
          → generateProceduralCase
              → selectScenarioPack
              → buildCharacterRoster
              → createDifficultyScenarioProfile
              → generateScenarioTemplate
              → generatePuzzle
              → validateHumanClueQuality
              → GameCase con ID infinite-dN-sSEED-g7
      → GameScreen
          → CaseSave V4 bajo el ID versionado
          → markInfiniteSessionCompleted
          → PlayerStats con ID lógico infinite-dN-sSEED
          → InvestigationHistory + logros
      → descartar/nuevo caso
          → clearCaseSave + clearInfiniteSession
```

Puntos de entrada: `App.tsx:66` e `InfiniteScreen.tsx:17-41`. La fachada está en `game/infinite/generator.ts`; el generador compartido, en `game/generation/proceduralCase.ts:15-29`; la sesión y la fuente de entropía, en `game/persistence/infiniteSession.ts:4-11`.

### Módulos realmente compartidos

- Contrato `GameCase`, dificultad D1–D5 y presets de 6×6/6 personajes a 10×10/10 personajes.
- Catálogo de seis `ScenarioPack`, roster, nombres y avatares.
- PRNG sembrado, layout, objetos, placement, pistas, reglas, solver, análisis y validación semántica.
- `GameScreen`, `CaseSave V4`, checkpoints, ayudas, historial y logros.
- Desbloqueo de dificultades a partir de `NormalModeProgress`. La UI de Daily lo explica; Infinite aplica la misma regla sin el mismo texto explicativo.
- Normal congelado comparte `scenarioPacks`, `avatarCatalog`, contratos y validadores, pero no ejecuta el generador procedural en runtime.

### Módulos que no deben confundirse

- Daily tiene su propia derivación de fecha/semilla, sesión, caché y bucle de reintentos.
- Infinite tiene semilla aleatoria explícita, sesión persistente con estado y la fachada común `generateProceduralCase`.
- Los casos Normal C01–C15 usan JSON versionado y `loadSerializedCase`; Daily e Infinite no importan ese loader, `manualNormalCases` ni sus wrappers.
- El `caseAssetRegistry` pertenece al límite JSON manual. Los modos procedurales usan imports estáticos de los catálogos de escenarios y avatares.

## 2. Contrato actual de aleatoriedad y semillas

### PRNG y fuentes ambientales

- `createSeededRandom` implementa una secuencia uint32 determinista. La misma semilla y el mismo orden de llamadas producen la misma secuencia.
- No hay ningún `Math.random()` ni `Date.now()` en los generadores, escenarios, roster, solver o validadores.
- Infinite usa `crypto.getRandomValues` únicamente para crear la semilla inicial. Después de persistirla, toda la generación es determinista.
- `crypto.randomUUID()` se usa en checkpoints, no para construir el caso.
- Daily usa `new Date()` en la UI y deriva la semilla a partir de la fecha civil local.
- Las únicas estructuras mutables de módulo relevantes son las cachés `Map` de Daily e Infinite. Están indexadas por fecha+dificultad o dificultad+semilla y no alteran el resultado.

El roster usa streams independientes con salts para género, nombres, avatares, roles, orden y víctima. La selección de escenario usa otro stream salado. Esto evita que cambios en draws del layout alteren indirectamente pack o roster. Dentro de cada etapa sí existe sensibilidad normal al orden de llamadas; por eso el orden de catálogos y el algoritmo forman parte del contrato de versión.

### Daily

- Identidad lógica: `daily-AAAA-MM-DD`.
- Identidad del puzzle: `daily-AAAA-MM-DD-dN`.
- Identidad de guardado actual: `daily-AAAA-MM-DD-dN-g7`.
- Semilla D1: hash uint32 del número de día calculado mediante `Date.UTC(añoLocal, mesLocal, díaLocal)`.
- D2–D5 añaden un salto determinista dependiente de dificultad.
- Si un intento no genera un caso aceptable, se prueba `baseSeed + offset`, con un máximo de 100 offsets.
- El resultado expone `baseSeed`, `effectiveSeed` y `seedOffset`, pero la sesión no los persiste.

### Infinite

- Identidad lógica: `infinite-dN-sSEED`.
- Identidad de guardado: `infinite-dN-sSEED-g7`.
- La semilla es un uint32 criptográficamente aleatorio al iniciar el caso.
- El generador prueba hasta 100 `seed + offset` de manera determinista.
- La sesión persiste la semilla base; no persiste la efectiva ni el offset. Con el mismo código, estos se reconstruyen.

### Reproducibilidad verificada

En las 500 entradas auditadas, la segunda generación fue estructuralmente idéntica a la primera, incluyendo tablero, roster, assets, pistas, solución, culpable, estadísticas y metadatos. Hubo 0 divergencias. Los tests existentes también comparan generaciones repetidas de Daily, Infinite, escenario D4/D5, roster y utilidades aleatorias.

La reproducibilidad garantizada es **dentro de la misma versión efectiva de código y catálogos**. No existe una garantía ejecutable entre versiones porque la aplicación no conserva el caso completo ni puede seleccionar una implementación histórica del generador.

## 3. Daily y fechas

### Comportamiento actual

Daily se rige por el calendario local del dispositivo, no por UTC, cuenta, servidor ni una zona configurada por producto. `getFullYear/getMonth/getDate` deciden la clave. `Date.UTC` solo convierte esos componentes ya locales en un ordinal estable; no convierte la política a UTC.

Consecuencias:

- Dos dispositivos que muestran la misma fecha civil obtienen la misma semilla y el mismo caso para una dificultad dada.
- Dos dispositivos en zonas distintas pueden tener Daily diferentes en el mismo instante absoluto.
- Cambiar manualmente hora o zona del dispositivo puede adelantar o retrasar el Daily y permite volver a fechas anteriores.
- El locale no afecta identidad ni semilla. Solo `Intl.DateTimeFormat('es-ES')` afecta la presentación.
- Los cambios DST no crean dos claves ni saltan una clave porque se usa la fecha civil, no una división directa del timestamp local.
- No hay identidad de usuario ni sincronización: el comportamiento es “global por etiqueta de fecha, disponible según el calendario local de cada dispositivo”.

### Pruebas temporales de zona y bordes

Se ejecutó el mismo módulo en `Europe/Madrid`, `UTC`, `America/New_York` y `Pacific/Kiritimati`.

- Madrid, 31/12/2026 23:59 → 01/01/2027 00:01: la clave cambió de `2026-12-31` a `2027-01-01` y la semilla de `3241264681` a `1600733146`.
- El mismo instante `2026-12-31T23:01Z` produjo `2027-01-01` en Madrid y Kiritimati, pero `2026-12-31` en UTC y Nueva York.
- Cambio DST de Madrid del 29/03/2026, 01:59 CET → 03:01 CEST: permaneció `2026-03-29`, semilla `2401966500`.
- Repetición DST del 25/10/2026, 02:59 CEST → 02:01 CET: permaneció `2026-10-25`, semilla `1487727830`.
- 28/02, 29/02 y 01/03 de 2024 produjeron tres IDs y semillas distintos.
- 31/12/2026 y 01/01/2027 produjeron IDs y semillas distintos en las cuatro zonas.
- Una sesión iniciada a las 23:59 dejó de cargar a las 00:01; el JSON anterior permaneció almacenado hasta ser sobrescrito.

### Rollover de una pantalla abierta

No existe timer, listener de `visibilitychange`, evento de resume de Capacitor ni reloj reactivo. `DailyScreen` ejecuta `new Date()` en cada render, mientras que `useState(existing)` solo inicializa la sesión una vez.

Por tanto:

1. Si no hay rerender tras medianoche, la pantalla puede seguir mostrando y jugando el Daily anterior indefinidamente.
2. Si cualquier cambio de estado provoca un rerender, `date` pasa al día nuevo pero `session` conserva el objeto del día anterior. Se genera el caso nuevo con la dificultad anterior sin crear/persistir una sesión del día nuevo.
3. `GameScreen` remonta porque cambia `gameCase.id`, de modo que el tablero visible puede cambiar durante una sesión abierta.
4. Tras recargar, `loadDailySession(fechaNueva)` devuelve `null` y vuelve al selector de dificultad.

La misma ausencia de actualización temporal existe en la tarjeta de inicio. El empaquetado PWA o Android no cambia este comportamiento React; una app reanudada puede quedar obsoleta hasta que algo cause render, y ese render activa la segunda rama descrita.

## 4. Contrato actual de persistencia

| Área | Daily | Infinite |
|---|---|---|
| Sesión | `saveVersion`, `dateKey`, `difficulty` | `saveVersion`, `generationVersion: 1`, `difficulty`, `seed`, `status` |
| Caso completo | No | No |
| Semilla base/efectiva | No; se deriva fecha/dificultad | Guarda base; no efectiva/offset |
| Versión procedural real | Solo en el ID de guardado `-g7` | Solo en el ID de guardado `-g7`; el campo de sesión vale `1` |
| Progreso del tablero | `CaseSave V4` bajo ID versionado | `CaseSave V4` bajo ID versionado |
| Contenido de CaseSave | placements, exclusiones manuales, usos de ayudas, checkpoints y position checks | Igual |
| Estado del solver | No se guarda | No se guarda |
| Finalización | `Progress` con ID lógico por fecha | `PlayerStats` con ID lógico dificultad+semilla y `status` de sesión |
| Historial | modo, ID lógico, dificultad, timestamps, ayudas | Igual |

`GameScreen` carga y guarda siempre por `gameCase.id`, mientras que la finalización puede usar un `completionId` lógico diferente. Esta separación evita que un cambio de versión contamine directamente un slot anterior, siempre que la versión `gN` se incremente.

### Restauración y corrupción

- `CaseSave` acepta V1–V4 y normaliza a V4. Sanitiza personajes, coordenadas, filas/columnas y checkpoints cuando recibe el `GameCase` reconstruido.
- JSON inválido, estructura desconocida o contadores inválidos vuelven a un save vacío.
- Daily acepta únicamente sesión V1 correspondiente exactamente a la fecha solicitada; una sesión antigua, corrupta o de otro día se ignora.
- Infinite acepta únicamente `saveVersion: 1` y `generationVersion: 1`; cualquier otra forma se ignora.
- No hay migraciones de sesión para Daily o Infinite.
- Los tests aíslan saves Normal/Daily/Infinite por ID, prueban corrupción y migración V1–V4 de tablero, y verifican el borrado global.

### Web, PWA y Android

Los tres empaquetados ejecutan el mismo código y usan `localStorage`. La PWA precachea JS, CSS, HTML, imágenes y fuentes. Capacitor copia `dist` al proyecto Android y no configura `server.url`, por lo que no necesita red para los assets del juego.

La persistencia es local al origen/WebView:

- No existe sincronización entre navegadores, dispositivos, web y Android.
- Web y PWA solo comparten datos cuando el navegador/plataforma les asigna el mismo origen y almacén; el código no garantiza ni migra entre almacenes.
- Android usa su WebView y conserva datos localmente mientras el sistema no borre datos o se desinstale la app.
- Las verificaciones automáticas prueban empaquetado, no un cierre/reapertura real del navegador, PWA instalada o actividad Android.

## 5. Resultados cuantitativos D1–D5

### Metodología

Se usaron 50 entradas por dificultad y modo, igualando el volumen por dificultad de `verify:clue-quality`. Infinite usó la fórmula de semillas de esa herramienta. Daily usó 50 fechas consecutivas desde el 01/01/2026. Para cada entrada:

1. Se generó dos veces y se comparó el objeto completo serializado.
2. Se ejecutaron `validateCaseDefinition`, `validateHumanClueQuality` y `solveCase(maxSolutions: 2)`.
3. Se comprobaron IDs internos, assets, ID de caso y firma estructural.
4. Se registraron offsets, reintentos de escenario, personajes, pistas, escenarios y culpables.

Los tiempos siguientes son coste de auditoría por muestra: incluyen dos generaciones completas más solver y validaciones adicionales. No equivalen a la latencia exacta de una sola generación en producción.

| Modo | D | Generados | Fallos finales | Offsets rechazados | Offset máximo | Reintentos escenario | Tiempo total | ms/muestra auditada | Personajes | Pistas personaje/caso | Globales/caso |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Daily | 1 | 50 | 0 | 148 | 21 | 3 | 630 ms | 12,60 | 6 | 17,90 | 0 |
| Daily | 2 | 50 | 0 | 112 | 12 | 1 | 1.060 ms | 21,20 | 7 | 21,74 | 0 |
| Daily | 3 | 50 | 0 | 74 | 6 | 1 | 5.595 ms | 111,90 | 8 | 28,12 | 0 |
| Daily | 4 | 50 | 0 | 115 | 10 | 0 | 35.504 ms | 710,08 | 9 | 32,96 | 1 |
| Daily | 5 | 50 | 0 | 236 | 25 | 4 | 64.421 ms | 1.288,42 | 10 | 44,72 | 2 |
| Infinite | 1 | 50 | 0 | 116 | 12 | 9 | 569 ms | 11,38 | 6 | 17,54 | 0 |
| Infinite | 2 | 50 | 0 | 88 | 12 | 3 | 1.139 ms | 22,78 | 7 | 22,06 | 0 |
| Infinite | 3 | 50 | 0 | 86 | 10 | 1 | 9.110 ms | 182,20 | 8 | 28,18 | 0 |
| Infinite | 4 | 50 | 0 | 109 | 10 | 1 | 33.175 ms | 663,50 | 9 | 32,90 | 1 |
| Infinite | 5 | 50 | 0 | 253 | 22 | 6 | 75.550 ms | 1.511,00 | 10 | 44,82 | 2 |

Resultados comunes a las diez filas:

- 0 validaciones de definición fallidas.
- 0 validaciones de calidad humana fallidas.
- 0 casos sin solución y 0 casos con más de una solución.
- 0 excepciones finales y 0 llamadas de generación rechazadas tras agotar 100 offsets.
- 0 divergencias deterministas.
- 0 colisiones internas de personajes, pistas, zonas o edge features.
- 0 colisiones de ID de caso dentro de la muestra.
- 0 referencias de asset vacías o `http(s)`.
- 0 firmas estructurales completas repetidas tras normalizar el ID del caso.

`offsets rechazados` es la suma de `seedOffset`, es decir, candidatos efectivos descartados antes de aceptar el caso. El código captura internamente el error de cada candidato, por lo que no conserva el desglose de causas. `reintentos escenario` suma `scenarioAttempts - 1` del intento finalmente aceptado; no incluye los intentos de seeds efectivas descartadas.

### Distribución de escenarios

Orden de columnas: cafetería, casa, oficina, exterior, hotel, hospital. Cada fila suma 50.

| Modo | D1 | D2 | D3 | D4 | D5 |
|---|---|---|---|---|---|
| Daily | 11/10/5/5/12/7 | 13/10/5/4/11/7 | 12/10/5/4/11/8 | 11/10/5/5/11/8 | 11/9/6/5/11/8 |
| Infinite | 6/11/4/13/11/5 | 12/8/5/7/9/9 | 14/6/11/4/8/7 | 6/9/7/10/9/9 | 6/11/9/11/7/6 |

Los seis packs aparecieron en cada dificultad y modo. Hay oscilaciones esperables con n=50; no se observó exclusión sistemática. La selección pretende ser uniforme por PRNG, pero esta muestra finita no demuestra uniformidad.

### Culpables y pistas

- Todos los índices de personaje posibles aparecieron como culpables en cada dificultad.
- El rango de frecuencia por índice fue Daily: 6–10, 5–10, 3–9, 2–10 y 2–7; Infinite: 4–13, 4–11, 3–10, 4–11 y 2–8 para D1–D5.
- En Infinite D1, `person-02` apareció 13/50 veces. Es el máximo de la muestra y merece seguimiento en una muestra mayor, pero no basta para declarar sesgo.
- Los roles de culpable cubrieron decenas de categorías de los seis escenarios; no hubo un rol único dominante en todos los estratos.
- La variedad de tipos de pista creció conforme a la política: 8 tipos en D1; 12 en D2; 17–18 en D3; 20–21 en D4; 22–23 en D5.
- D4 produjo exactamente una pista global por caso y D5 exactamente dos. D1–D3 no produjeron pistas globales.
- D4/D5 añadieron evidencia de bordes; D5 añadió traits y `zoneTraitCount`, conforme a los requisitos del generador.

### Herramientas oficiales

`npm run verify:clue-quality` verificó 250 puzzles, 50 por dificultad:

| Dificultad | Tiempo |
|---|---:|
| D1 | 326 ms |
| D2 | 521 ms |
| D3 | 4.412 ms |
| D4 | 17.006 ms |
| D5 | 38.568 ms |

`npm run profile:d5 -- --samples=20` obtuvo 20/20 éxitos, 0 fallos, media de 793 ms por generación, máximo de 2.526 ms, `seedOffset` medio 4,2 y máximo 15, 4,4 llamadas de solver de media y máximo 8, y 46,2 pistas seleccionadas de media.

## 6. Validez, solver y dificultad

El pipeline aplica las siguientes garantías antes de devolver un caso:

1. La plantilla valida dimensiones, personajes, víctima, zonas, objetos, conectividad y celdas.
2. El placement impone una fila y columna únicas por personaje y busca un asesino único.
3. Las pistas candidatas se construyen verdaderas respecto a la solución canónica.
4. La selección restringe vocabulario y cuotas por dificultad, diversidad y legibilidad.
5. El solver busca hasta dos soluciones y rechaza ambigüedad, contradicción o truncamiento.
6. La solución única debe coincidir con la canónica.
7. `validateCaseDefinition` revisa referencias, IDs, tablero, solución, pistas y asesino.
8. `analyzeCase` vuelve a confirmar unicidad y coincidencia canónica.
9. `validateHumanClueQuality` rechaza coordenadas procedurales, redundancia, proporción negativa, componentes sin anchor, relación directa con víctima y revelaciones directas del culpable.

Los límites procedurales son 10 llamadas de solver, 4.000 nodos por solve, 8 pasos de refinamiento, 2.000 evaluaciones de candidatos y 160 intentos de minimización. Daily e Infinite desactivan minimización (`minimizeClues: false`), pero mantienen los demás límites.

La garantía de unicidad no depende de leer `caseData.solution` durante la búsqueda del solver; existe un test explícito. La solución canónica sí se usa después para comprobar coincidencia y verdad de pistas.

## 7. IDs y colisiones

| Entidad | Formato/alcance | Evaluación |
|---|---|---|
| Daily lógico | `daily-AAAA-MM-DD` | No colisiona con Normal/Infinite; una finalización por día, independientemente de dificultad |
| Daily puzzle/save | `daily-AAAA-MM-DD-dN-g7` | Dificultad y versión aisladas |
| Infinite lógico | `infinite-dN-sUINT32` | Dificultad+semilla; estable al reconstruir |
| Infinite save | `infinite-dN-sUINT32-g7` | Aísla versión si se incrementa correctamente |
| Personajes | `person-01`…`person-10` | Se repiten entre casos, pero están correctamente acotados por `GameCase` |
| Pistas | Prefijo `gen-` y componentes semánticos | Validator exige unicidad dentro del caso |
| Zonas/objetos/roles | IDs estables del pack | Referencias locales al caso/pack; objetos pueden ocupar varias celdas intencionalmente |
| Edge features | `gen-window-1`, `gen-door-1`, extra `-2` | Unicidad validada dentro del caso |
| Checkpoints | `crypto.randomUUID()` | No determinista, pero no forma parte del caso; aislado dentro del save |

`InvestigationHistory` valida el namespace y la dificultad codificada de cada ID lógico. `PlayerStats` solo acepta IDs Infinite uint32 bien formados. La muestra no encontró colisiones.

La semilla Infinite nueva solo excluye la inmediatamente anterior. Puede repetir por azar cualquier seed histórica de la misma dificultad; con n casos previos, la probabilidad aproximada es n/2³² por generación. En ese caso el contenido y el ID lógico se repiten, y `completedInfiniteCaseIds` lo deduplica. El riesgo práctico actual es bajo, pero la semántica de estadísticas debe decidir si una repetición cuenta como caso nuevo.

## 8. Assets y contenido generado

- Hay seis packs importados estáticamente: cafetería, casa, oficina, exterior, hotel y hospital.
- Cada zona y objeto usa una imagen local importada desde `src/assets`; los 24 avatares también son imports locales.
- No hay URLs de red en estos catálogos.
- La misma semilla conserva pack, layout, objetos, avatares y roster dentro de la versión auditada.
- El validator de escenario rechaza iconos vacíos. La muestra comprobó además los assets presentes en el `GameCase` final.
- Vite incluye los imports en `dist`; Workbox usa `globPatterns` que incluye PNG/SVG/WebP y fuentes, con máximo individual de 4 MiB.
- Capacitor sirve la copia local de `dist` desde `android/app/src/main/assets/public`.
- Daily e Infinite no consultan accidentalmente `caseAssetRegistry` ni el registro JSON Normal.

Las verificaciones PWA/Android confirman presencia y empaquetado, pero no recorren visualmente cada combinación generada en modo avión. Esa cobertura sigue siendo un hueco de integración.

## 9. Separación entre modos

### Correcto

- Daily no usa un caso JSON manual como fallback.
- Infinite no importa wrappers C01–C15 ni `manualNormalCases`.
- Normal publicado carga manuales o casos congelados; no invoca generación procedural en runtime.
- Los namespaces de casos, saves, progreso e historial separan `normal`, `daily` e `infinite`.
- El vínculo con Normal es progresión, no contenido: las dificultades desbloqueadas gobiernan qué D puede iniciar Daily/Infinite.
- `GameCase`, solver, reglas, validadores, pantalla y persistencia de tablero son compartidos con sentido.

### Acoplamientos conscientes o pendientes de producto

- Daily e Infinite dependen de `NormalModeProgress` para desbloquear dificultad. Está explicitado en Daily, pero debe confirmarse como política para Infinite.
- Normal congelado comparte catálogos de escenarios y avatares con la generación actual. Cambiar esos catálogos puede cambiar la hidratación visual de casos Normal congelados aunque no se ejecute el generador.
- El historial usa IDs lógicos sin versión, mientras que el save usa IDs versionados. Esto preserva estadísticas agregadas entre versiones, pero no conserva una partida activa.

## 10. Hallazgos por severidad

### ALTO-1 — Rollover Daily incoherente con la pantalla montada

- **Ubicación:** `DailyScreen.tsx:17-23`, `HomeScreen.tsx:17-30`, `dailySession.ts:7-8`.
- **Flujo:** Daily web, PWA y Android; sesión iniciada antes de medianoche o app reanudada después.
- **Evidencia reproducible:** la prueba multizona confirmó que la sesión 31/12 deja de ser válida el 01/01. El código calcula una fecha nueva en cada render, pero conserva el estado React anterior y no tiene observador de cambio de día.
- **Impacto:** caso anterior visible más allá de medianoche, sustitución inesperada por el caso nuevo durante una interacción, dificultad nueva no persistida, cambio de tablero y saves separados dentro de una pantalla que el jugador percibe como la misma sesión.
- **Solución mínima recomendada:** decidir primero si una partida iniciada puede terminar después de medianoche. Capturar un `dateKey` estable en la sesión/pantalla y, al detectar rollover o resume, continuar explícitamente el caso anterior o bloquearlo con una transición explícita al nuevo. Nunca combinar fecha nueva con sesión vieja.
- **Tests necesarios:** fake clock antes/después de medianoche, rerender, `visibilitychange`, PWA resume y lifecycle de actividad Android; cubrir ambas políticas posibles.
- **Riesgo de aplicar:** medio; cambia UX, completion IDs y navegación temporal.
- **Dependencias:** decisión de producto sobre caducidad del Daily y zona de referencia.

### ALTO-2 — Una sesión activa no está ligada a una implementación reconstruible del generador

- **Ubicación:** `generation/version.ts:1-2`, `dailySession.ts:5-8`, `infiniteSession.ts:4-8`, `GameScreen.tsx:36-66`.
- **Flujo:** restauración Daily/Infinite después de actualizar web/PWA/Android.
- **Evidencia:** `PROCEDURAL_GENERATION_VERSION` vale 7 y forma parte del ID del `GameCase`. Daily no guarda versión, seed efectiva ni caso. Infinite guarda el literal `generationVersion: 1`, que no se compara con 7 ni selecciona código v1. Ambos regeneran con el código actual.
- **Impacto:** si se incrementa `g7`, el save anterior queda intacto pero inaccesible y la partida aparece reiniciada. Si se modifica el generador sin incrementar la versión, el nuevo caso reutiliza el mismo slot y el sanitizador puede descartar o reinterpretar progreso/checkpoints contra otro tablero.
- **Solución mínima recomendada:** definir una única versión procedural persistida y derivada de la constante real. Al cargar, o bien conservar un snapshot mínimo suficiente del `GameCase`, o bien mantener un migrador/generador histórico, o bien invalidar con un mensaje explícito y política de compensación. Añadir una regla obligatoria para incrementar versión ante cualquier cambio que altere output.
- **Tests necesarios:** fixture de sesión/save de versión N cargado por N+1; cambio de algoritmo con y sin bump; prueba de que nunca se aplica un save antiguo a estructura distinta; compatibilidad o invalidación explícita.
- **Riesgo de aplicar:** medio-alto; toca esquema de sesión y compatibilidad histórica.
- **Dependencias:** decisión de producto sobre cuánto tiempo debe sobrevivir una partida procedural a actualizaciones.

### MEDIO-1 — Política Daily no definida entre global, dispositivo y usuario

- **Ubicación:** `daily/date.ts:2-7`, textos de `DailyCaseCard` y `DailyScreen`.
- **Flujo:** disponibilidad, streaks, finalización e historial Daily.
- **Evidencia:** el mismo instante produjo fechas distintas según zona; no existe cuenta ni servidor; el reloj puede cambiarse manualmente.
- **Impacto:** jugadores en zonas distintas cambian de caso en momentos distintos; cambiar reloj/zona permite acceder a otro Daily; no hay continuidad entre dispositivos.
- **Solución mínima recomendada:** documentar y aprobar una de estas políticas: fecha local del dispositivo, fecha UTC global o fecha de cuenta/servidor. Si se mantiene offline/local, declarar explícitamente sus límites.
- **Tests necesarios:** matriz de zonas, cambios manuales, límites de fecha y streaks coherentes con la política elegida.
- **Riesgo de aplicar:** alto si se cambia la política; bajo si solo se documenta.
- **Dependencias:** producto, posible identidad/sincronización futura y estrategia offline.

### MEDIO-2 — Los reintentos absorben todas las excepciones y pierden su causa

- **Ubicación:** `daily/generator.ts:19-28`, `generation/proceduralCase.ts:19-28`.
- **Flujo:** diagnóstico y observabilidad de generación.
- **Evidencia:** ambos bucles usan `catch { continue }`. La muestra observó 685 offsets rechazados en Daily y 652 en Infinite, pero no puede distinguir layout imposible, presupuesto de solver, calidad de pistas o defecto de programación.
- **Impacto:** una regresión puede aumentar mucho los reintentos o quedar enmascarada mientras todavía existe algún offset exitoso; si se agotan 100, el error final tampoco contiene las causas.
- **Solución mínima recomendada:** instrumentar contadores tipados por causa para tests/tooling, manteniendo el mismo comportamiento de producción; no exponer detalles sensibles al usuario.
- **Tests necesarios:** causas controladas, agregación estable, presupuesto máximo y ausencia de cambios en el caso aceptado.
- **Riesgo de aplicar:** bajo si solo añade telemetría interna pura; medio si cambia clasificación de excepciones.
- **Dependencias:** taxonomía de errores del escenario/generador.

### MEDIO-3 — No hay prueba end-to-end de reanudación offline en PWA o Android

- **Ubicación:** verificadores de build, `release-checklist.md`, tests de persistencia en memoria.
- **Flujo:** cerrar/reabrir, actualizar service worker, reanudar actividad y jugar offline.
- **Evidencia:** los tests unitarios cubren normalización e aislamiento; los scripts comprueban archivos de build y copia de `dist`. No arrancan una PWA instalada ni una WebView Android, ni simulan actualización mientras existe una sesión procedural.
- **Impacto:** los contratos locales son sólidos, pero no hay evidencia automatizada de lifecycle, cuotas/borrado de WebView, actualización PWA o rollover real en esas plataformas.
- **Solución mínima recomendada:** añadir pruebas de integración por fases y mantener un checklist manual de release hasta automatizarlas.
- **Tests necesarios:** PWA offline cold start, refresh con save, actualización de SW con partida activa, Android close/reopen y resume después de medianoche.
- **Riesgo de aplicar:** bajo para tests; coste de infraestructura medio.
- **Dependencias:** entorno de navegador y emulador/dispositivo Android.

### BAJO-1 — Infinite solo evita repetir la seed inmediatamente anterior

- **Ubicación:** `infiniteSession.ts:11`, `playerStats.ts:49-52`.
- **Flujo:** generar muchos casos Infinite y estadísticas.
- **Evidencia:** `createInfiniteSeed` excluye un único valor; el histórico completado se deduplica por ID lógico.
- **Impacto:** una repetición histórica improbable muestra exactamente el mismo caso y no incrementa el conjunto de casos únicos completados.
- **Solución mínima recomendada:** decidir si esto es correcto. Si no, excluir semillas activas/completadas recientes o registrar ejecuciones separadas de identidad de puzzle.
- **Tests necesarios:** generador de entropía inyectable que fuerza repetición histórica y comprueba la política elegida.
- **Riesgo de aplicar:** bajo, salvo crecimiento ilimitado del histórico de exclusión.
- **Dependencias:** definición de “caso completado” en estadísticas.

### BAJO-2 — Saves Daily terminados y saves de versiones antiguas quedan huérfanos

- **Ubicación:** `GameScreen.tsx:36-66`, `DailyScreen.tsx:20-23`, `resetProgress.ts`.
- **Flujo:** almacenamiento local a largo plazo.
- **Evidencia:** completar Daily no elimina su `CaseSave`; cambiar `gN` crea otra clave. Solo el reset global limpia los patrones históricos.
- **Impacto:** crecimiento gradual de `localStorage` y posible presión de cuota en uso muy prolongado, especialmente con checkpoints.
- **Solución mínima recomendada:** política acotada de retención y limpieza segura después de finalización/expiración, conservando estadísticas.
- **Tests necesarios:** limpieza por edad/versión sin borrar la sesión activa ni claves ajenas.
- **Riesgo de aplicar:** medio si la selección de claves es incorrecta.
- **Dependencias:** política de retención y posibilidad de revisar partidas terminadas.

## 11. Comportamientos correctos respaldados

- **CORRECTO:** misma entrada y versión produce exactamente el mismo resultado en la muestra de 500.
- **CORRECTO:** solver y análisis exigen solución única y coincidencia canónica antes de devolver el caso.
- **CORRECTO:** `validateCaseDefinition` se ejecuta dentro de `generatePuzzle` para todo Daily/Infinite aceptado.
- **CORRECTO:** D1–D5 respetan dimensiones, personajes y vocabulario progresivo.
- **CORRECTO:** IDs de caso y saves están namespaced por modo; la muestra no encontró colisiones.
- **CORRECTO:** assets procedurales son locales, deterministas e incluidos por el bundler.
- **CORRECTO:** datos corruptos de sesión o tablero no se usan sin validar; se ignoran o normalizan.
- **CORRECTO:** no existe fallback silencioso a casos manuales Normal.
- **CORRECTO:** no existe `Math.random` en el pipeline; la única entropía Infinite es explícita y se persiste.
- **CORRECTO con límite:** `-g7` aísla saves entre versiones si la constante se incrementa disciplinadamente, pero no restaura la partida anterior.

## 12. Cobertura existente y huecos

### Cobertura existente

- Daily: determinismo por fecha, variedad de roster durante 365 días, D1–D5 válidos/únicos/legibles, caché e independencia de Case001/catálogos.
- Sesión Daily: inicio único, dificultad bloqueada, cambio de fecha e identidades.
- Infinite: sesión, corrupción, D1–D5, determinismo, caché, finalización separada del progreso global.
- Generador: PRNG, shuffle, pistas verdaderas, unicidad, no mutación, límites y regresiones D5.
- Escenarios D4/D5: determinismo, edge features y traits.
- Solver/validator: único, ambiguo, imposible, truncamiento y referencias inválidas.
- Persistencia: CaseSave V1–V4, corrupción, sanitización, checkpoints, aislamiento por modo y reset.
- Historial: namespaces, timestamps, dificultad y ayudas.

### Huecos concretos

1. Lifecycle de Daily montado al cruzar medianoche.
2. `visibilitychange`/resume PWA y Capacitor.
3. Matriz automatizada UTC/zonas/DST/año bisiesto.
4. Cambio manual de reloj o zona con sesión activa.
5. Política y migración de versión procedural para sesiones/saves.
6. Comparación contra fingerprints congelados por versión del generador.
7. Causas y distribución de reintentos; hoy solo se observa el offset aceptado.
8. Test de colisiones sobre una muestra amplia permanente; la muestra de esta auditoría fue temporal.
9. Verificación offline funcional de cada asset en PWA instalada y Android, no solo precache/copia.
10. Recuperación ante error de escritura de `localStorage` o cuota agotada.
11. Repetición histórica de seed Infinite y semántica de estadísticas.
12. Retención/limpieza de saves Daily caducados y versiones antiguas.

## 13. Decisiones de producto pendientes

1. ¿Daily cambia por medianoche local, UTC o zona de cuenta?
2. ¿Una partida Daily iniciada antes de medianoche puede terminarse después? Si sí, ¿durante cuánto tiempo?
3. ¿Daily pretende ser el mismo contenido para una misma fecha civil mundial, para el mismo instante mundial o solo para cada dispositivo?
4. ¿Se espera continuidad entre web, PWA, Android o dispositivos? Hoy no existe.
5. ¿Una actualización debe preservar una partida procedural exacta o puede invalidarla con aviso?
6. ¿El desbloqueo de dificultad Normal debe gobernar también Infinite? El código lo hace; solo Daily lo explica expresamente.
7. ¿Repetir una seed Infinite histórica cuenta como caso nuevo, repetición o debe evitarse?
8. ¿Cuánto tiempo deben conservarse saves Daily finalizados/caducados?

## 14. Plan de corrección por fases

### Fase 0 — Cerrar contratos de producto

- Elegir zona y autoridad temporal de Daily.
- Elegir política de rollover y caducidad.
- Elegir compatibilidad entre versiones y plataformas.
- Confirmar desbloqueos y semántica de repetición Infinite.

**Aceptación:** decisiones escritas, ejemplos de borde y ninguna contradicción entre UI, persistencia y analítica.

**Validación:** revisión de producto+ingeniería; tabla de estados antes/después de medianoche y actualización.

### Fase 1 — Hacer estable el ciclo de vida Daily

- Introducir un reloj inyectable y un `dateKey` explícito de sesión/pantalla.
- Detectar cambio de día y resume.
- Aplicar la política elegida sin mezclar sesión vieja con fecha nueva.

**Aceptación:** ningún rerender cambia silenciosamente el caso; reload y resume llevan al mismo estado decidido.

**Validación:** tests de componente con fake time, cuatro zonas, DST, fin de mes/año y PWA/Android resume.

### Fase 2 — Versionar y restaurar sesiones procedurales

- Unificar versión de sesión con `PROCEDURAL_GENERATION_VERSION`.
- Implementar snapshot, generador histórico o invalidación explícita.
- Evitar aplicar saves a otra estructura.

**Aceptación:** una sesión de versión N cargada por N+1 se restaura idéntica o se invalida de forma explícita y verificable; nunca parece continuar con otro tablero.

**Validación:** fixtures N/N+1, fingerprints, saves parciales/checkpoints y pruebas de migración/cancelación.

### Fase 3 — Observabilidad y presupuestos

- Tipar causas de rechazo y exponer métricas solo a tests/tooling.
- Establecer umbrales de offsets, tiempo y llamadas de solver por dificultad.

**Aceptación:** todo candidato rechazado tiene una causa; los outputs aceptados no cambian.

**Validación:** snapshot estructural antes/después, muestra ≥50/D y perfil D5.

### Fase 4 — Integración offline y retención

- Automatizar cold start/reload/update PWA y close/reopen Android.
- Aplicar la política de retención de saves.
- Cubrir cuota/error de almacenamiento.

**Aceptación:** una partida activa se conserva en cada plataforma soportada; assets visibles sin red; limpieza no elimina datos activos ni ajenos.

**Validación:** navegador automatizado offline, emulador Android offline, APK debug y pruebas de almacenamiento manipulado.

### Fase 5 — Control estadístico continuo

- Convertir la muestra temporal mínima en herramienta/test de CI con resultados resumidos.
- Vigilar distribución de packs, culpables, clue families, offsets y tiempos sin imponer falsos umbrales de uniformidad.

**Aceptación:** 0 inválidos/ambiguos/colisiones y alertas reproducibles ante regresión significativa.

**Validación:** seeds fijas versionadas, fingerprints por versión y comparación histórica.

## 15. Validaciones ejecutadas

### Inspección y pruebas específicas

- `git branch --show-current`: `pre`.
- `git status --short --branch`: `## pre...origin/pre`, limpio al inicio.
- Búsqueda global de aleatoriedad/fechas: 0 `Math.random` y 0 `Date.now` en el pipeline; `crypto.getRandomValues` solo crea seed Infinite.
- Prueba temporal de 500 casos: correcta con los resultados cuantitativos anteriores; el script temporal fue eliminado.
- Prueba temporal de fechas en cuatro zonas: correcta respecto al contrato local descrito; el script temporal fue eliminado.
- Tests dirigidos de Daily, Infinite, generador, escenario, solver, validator, save e historial: 14 archivos, 149 tests correctos en 5,88 s.
- `npm run verify:clue-quality`: 250 puzzles correctos.
- `npm run profile:d5 -- --samples=20`: 20/20 correctos; media 793 ms, máximo 2.526 ms.

### Matriz final

- `npx tsc -b`: correcto, sin diagnósticos.
- `npm run lint`: correcto, sin diagnósticos.
- Suite dirigida: 14 archivos y 149 tests correctos en 5,88 s.
- `npx vitest run`: 82 archivos y 555 tests correctos en 7,68 s.
- `npm run verify:clue-quality`: 250 puzzles correctos; 50 por D1–D5.
- `npm run profile:d5 -- --samples=20`: 20 éxitos, 0 fallos.
- `npm run verify:normal-cases`: 21 casos Normal publicados correctos, sin mezcla con los modos procedurales.
- `npm run build`: correcto; 446 módulos transformados, 225 entradas PWA y 112.849,49 KiB de precache.
- `npm run verify:pwa`: build y verificador PWA correctos.
- `npm run verify:pages`: build Pages, verificador PWA y verificador Pages correctos; 225 entradas y 112.852,28 KiB de precache.
- `npm run verify:android`: build web, copia local de assets, `cap sync android` y verificador Android correctos.
- `android\\gradlew.bat assembleDebug --offline`: `BUILD SUCCESSFUL` en 1 s; 93 tareas, 24 ejecutadas y 69 actualizadas.
- `git diff --check`: correcto, sin errores de whitespace; solo avisos locales de futura conversión LF→CRLF.

Avisos no bloqueantes observados: chunk principal superior a 500 kB, uso de `flatDir` en Gradle y APIs Gradle obsoletas de cara a Gradle 9. No se descargaron dependencias ni se usó la red.

## Conclusión de la línea base

El núcleo generativo auditado ofrece evidencia fuerte de validez, unicidad, determinismo intra-versión, separación de contenido manual y disponibilidad offline de assets. El principal riesgo no está en la lógica de los puzzles observados, sino en la identidad temporal de Daily y en la falta de un contrato de restauración entre versiones del generador.

Antes de cambiar el algoritmo conviene resolver primero las decisiones de producto de fecha/rollover y compatibilidad. Después, las correcciones pueden abordarse en fases pequeñas sin convertir Daily o Infinite a JSON ni alterar casos Normal.

## Conclusión posterior

El endurecimiento ejecutó esas fases mínimas. Daily tiene ahora un lifecycle temporal coherente y Daily/Infinite restauran sesiones V2 desde un snapshot validado, independiente del algoritmo futuro. La migración V1 queda explícitamente limitada por la información que el formato antiguo conservaba. Normal, los JSON C01–C15, `schemaVersion` y el pipeline generativo permanecen fuera del cambio.
