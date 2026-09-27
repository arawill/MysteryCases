# Auditoría operativa de retención, almacenamiento y observabilidad procedural

Fecha: 24 de septiembre de 2026.

Rama auditada: `pre`.

Estado inicial de la auditoría: árbol de trabajo limpio. La implementación posterior se hizo sobre `pre` y se dejó sin commit.
Alcance de la auditoría original: análisis, medición, pruebas aisladas y documentación. La sección siguiente registra el endurecimiento posterior; las mediciones históricas se conservan como evidencia del estado previo.

## Estado final del endurecimiento de saves

Los tres hallazgos ALTOS de persistencia quedan resueltos sin cambiar `CaseSave V4`, envelope procedural V2, snapshot V1, generador `g7`, seeds, casos ni fingerprints:

- **Reset completo:** un catálogo tipado valida las 21 identidades manuales publicadas, saves procedurales, receipts de intento, sesiones y claves fijas. El reset elimina partidas, progreso, estadísticas, historial/rachas y logros porque esa es la promesa visible de Opciones; conserva `mystery-cases-settings` y claves ajenas.
- **Finalización transaccional:** Normal, Daily e Infinite preparan un journal V1 con ID, tipo y valores exactos anterior/posterior. La recuperación termina el commit de forma idempotente o revierte al estado anterior si el backend no admite el estado final. Un receipt `{caseId, sequence, status}` impide duplicar historial, estadísticas, rachas o logros ante dos llamadas/pestañas.
- **Retención Daily:** se conserva el Daily de la fecha local actual y una sesión anterior mientras sea válida y activa. Completar o abandonar elimina sesión/snapshot y save en la misma transacción. La limpieza elimina exclusivamente claves Daily validadas que sean antiguas, inaccesibles y no estén protegidas por recuperación.
- **Cuota/interrupción:** todas las escrituras transaccionales verifican lectura posterior; `CaseSave` restaura el valor previo si una escritura falla. La UI mantiene la partida y muestra un aviso no fatal. Un journal corrupto o de versión desconocida se descarta sin tocar sus supuestos destinos.

Orden de arranque elegido: (1) recuperar el journal raw pendiente, (2) migrar/restaurar envelopes conocidos, (3) validar sesiones, (4) determinar el Daily activo, (5) limpiar Daily inaccesibles y (6) renderizar. La recuperación precede deliberadamente a las migraciones: los valores `before/after` del journal pertenecen a la versión persistida que originó la operación; migrarlos antes podría invalidar una reversión exacta.

Riesgos residuales dentro del alcance: `localStorage` no ofrece bloqueo interprocesos real; se usa verificación de propiedad del journal para que una pestaña que perdió la propiedad aborte. Si el backend permanece completamente indisponible también para revertir, el journal se conserva para el siguiente arranque. El historial Daily/Infinite válido sigue creciendo por diseño; solo se podan tableros Daily inaccesibles. Quedan explícitamente fuera de este cambio la observabilidad de reintentos, optimización del solver y prevención de seeds Infinite repetidas.

Evidencia final: TypeScript y oxlint sin errores; 89 archivos/604 tests de Vitest; matriz dirigida de persistencia, migraciones, estadísticas, logros y fingerprints con 13 archivos/100 tests; 250 puzzles en la auditoría de pistas; perfil D5 20/20; 21 casos Normal publicados; builds/verificadores PWA, GitHub Pages y Capacitor Android correctos; APK debug reconstruida con Gradle `--offline`; `git diff --check` sin errores. Permanecen avisos no bloqueantes ya conocidos por tamaño del chunk web y deprecaciones/`flatDir` de Gradle.

## Resumen ejecutivo

La persistencia de la partida activa es conceptualmente sólida: Daily e Infinite conservan un snapshot completo, validado y versionado; Normal conserva el tablero mutable; una recarga restaura el mismo caso sin regenerarlo. Todo el estado de usuario reside en `localStorage`. No hay IndexedDB, `sessionStorage`, Capacitor Preferences, filesystem ni backend. Cache Storage solo contiene el precache reconstruible de la PWA.

No se encontró un riesgo CRÍTICO. Sí hay tres hallazgos ALTOS:

1. **El reseteo de progreso no borra 20 saves Normal manuales actuales.** `resetProgress.ts:11-15` reconoce `case001` y los IDs procedurales `normal-dN-cNN-gN`, pero no `case002`…`case015` ni `case-d2-01`…`case-d2-06`. Una prueba aislada confirmó que las cuatro familias muestreadas permanecen después de “Resetear progreso”.
2. **Las finalizaciones escriben varias claves sin transacción ni recuperación.** Un fallo de cuota entre escrituras puede dejar Daily marcado como completado sin historial, o Infinite con sesión `completed` pero sin estadísticas/historial. Al recargar, la UI ya no vuelve a ejecutar las escrituras perdidas.
3. **Daily deja un `CaseSave` inaccesible por día y no existe control de cuota.** Con el uso representativo medido, un Daily diario ocupa 3.265.557 unidades de código tras tres años, aproximadamente 6,23 MiB si el motor contabiliza dos bytes por unidad UTF-16. El límite real depende del navegador/WebView y la aplicación no lo consulta; el crecimiento es indefinido y termina fallando para cualquier cuota finita.

La medición adicional de generación cubrió 340 casos reproducibles: 40 por dificultad en D1–D3, 30 en D4 y 20 en D5, para Daily e Infinite. Los 340 terminaron correctamente, pero 231 (68 %) necesitaron al menos un offset. Se descartaron 775 candidatos. El solver representó el 89 % del tiempo total instrumentado; D5 alcanzó 6.128 ms y 30 candidatos en el peor caso de la muestra. La aplicación actual solo devuelve estadísticas del intento aceptado y silencia todas las causas anteriores.

La seed Infinite es un `uint32` uniforme obtenido mediante `crypto.getRandomValues`. Solo se evita repetir inmediatamente la seed anterior, y únicamente mientras vive el estado React que la recuerda. Existe un historial local completo de IDs Infinite resueltos, pero no se consulta al crear la seed. Una ejecución reproducible de `createInfiniteSeed` con fuente uniforme determinista inyectada produjo 130 duplicados en 1.000.000 de resultados, cerca de los 116,42 pares esperados. Para el uso humano normal el riesgo por siguiente sorteo es muy bajo; no justifica por sí solo cambiar el generador.

## 1. Backends e inventario completo

### Backends reales

| Backend | Uso | Persistencia | Evidencia |
| --- | --- | --- | --- |
| `localStorage` | Todos los saves, sesiones, progreso, historial, logros y opciones | Persistente por origen/WebView | Todos los módulos de `game/persistence` y `GameScreen.tsx:36` |
| Cache Storage / service worker | Bundle PWA reconstruible, no datos de juego | Cache por origen | `vite.config.ts`; 225 entradas, 112.857,46 KiB en build web |
| Memoria de módulo | `Map` de Normal, Daily e Infinite generados | Hasta recarga/proceso muerto | `normal/generator.ts`, `daily/generator.ts`, `infinite/generator.ts` |
| Estado React | Tablero, selección, modal, undo y seed anterior | Hasta desmontaje/proceso muerto | `GameScreen`, `DailyScreen`, `InfiniteScreen` |
| WebView Android | Implementación interna de `localStorage` | Datos de la aplicación Android | Capacitor empaqueta la misma aplicación web; no hay plugin de almacenamiento |

No se encontró uso de IndexedDB, WebSQL, `sessionStorage`, Capacitor Preferences, Capacitor Filesystem ni archivos de usuario propios. Los archivos bajo `android/app/src/main/assets/public` son el bundle copiado por `cap sync`, no saves. `AndroidManifest.xml:4` declara `allowBackup="true"`, pero no hay reglas explícitas de backup: el posible backup/restablecimiento de datos WebView queda delegado a Android y no está probado.

### Claves persistentes

Los tamaños son unidades de código JavaScript de clave + valor JSON. Son comparables y reproducibles, pero no garantizan cómo cada motor computa cuota o almacenamiento físico.

| Clave exacta | Formato | Contenido y modo | Creación/actualización | Eliminación/sobrescritura | Riesgos y datos inválidos |
| --- | --- | --- | --- | --- | --- |
| `mystery-cases-${caseId}` | `CaseSave` V4; carga V1–V4 | Tablero, descartes manuales, ayudas, hasta 20 checkpoints y comprobaciones. Normal/Daily/Infinite | `GameScreen` la escribe incluso al montar un caso vacío; después de cada cambio mediante `useEffect`; comprobación de posición además escribe inmediatamente | Normal la borra al completar. Infinite la borra al descartar o pedir otro. Daily no la borra. Reset intenta borrarla por patrón | Dinámica; puede quedar huérfana. JSON inválido retorna save vacío y la cadena corrupta queda almacenada hasta la siguiente escritura/borrado |
| `mystery-cases-progress` | V1 | IDs globales completados; en la UX actual, sobre todo `daily-YYYY-MM-DD` y la ruta directa `case001` | Al completar con `recordGlobalCompletion=true` | Nunca se poda; reset la borra; cada escritura reemplaza el array completo | Crecimiento diario lineal. Solo valida que los elementos sean strings, no el patrón/longitud |
| `mystery-cases-normal-progress` | V2; lee V1 | Dificultad seleccionada y números Normal completados por D1–D5 | Cambiar dificultad o completar Normal | Se sobrescribe; reset la borra | Acotada (hasta 80 números por dificultad en el normalizador; 21 publicados hoy). V1 se normaliza en memoria y se reescribe en la siguiente mutación |
| `mystery-cases-daily-session` | Envelope V2 + snapshot V1 + generador g7; lee sesión V1 | Único snapshot Daily completo actual | Al comenzar Daily; una V1 válida se reconstruye y migra una vez | El siguiente Daily iniciado sobrescribe la clave. No se borra al completar. Reset la borra | Acotada a un snapshot. Una fecha anterior deja de cargar, pero permanece hasta sobrescritura. Snapshot inválido retorna `null` sin borrar el raw V2 |
| `mystery-cases-infinite-session` | Envelope V2 + snapshot V1 + estado; lee sesión V1 | Único Infinite activo o completado | Al generar; al completar cambia `active` a `completed`; una V1 se migra | Descartar o “Generar otro” la borra; reset la borra; no se puede empezar otro mientras exista | Acotada. Snapshot inválido retorna `null` y el raw queda. Escritura de sesión captura excepciones y retorna `null` |
| `mystery-cases-player-stats` | V1 | IDs lógicos Infinite únicos y contadores globales de ayudas | Cada ayuda y cada finalización Infinite | Nunca se poda; reset la borra; reemplazo completo | `completedInfiniteCaseIds` crece sin límite. Es también un historial de dificultad+seed, pero no se usa para evitar repetición |
| `mystery-cases-investigation-history` | V1 | Un registro por ID lógico con fechas, número de runs y mejor/último uso de ayudas | Cada finalización Normal/Daily/Infinite | Nunca se poda; reset la borra; reemplazo completo | Crece por fecha Daily y seed Infinite. Registros inválidos se descartan al leer, sin limpiar el raw hasta una escritura posterior |
| `mystery-cases-achievements` | V1 | Hasta 21 logros y timestamps | Reconciliación al iniciar y tras completar | Acotada; reset la borra | Migra en memoria `normal-all-400` a `normal-all-75`; datos inválidos se ignoran |
| `mystery-cases-settings` | V1 | Tema y autodesmarque | Cambiar una opción | Se sobrescribe; el reset la conserva deliberadamente | Acotada; datos inválidos vuelven a defaults |

El tamaño vacío de `CaseSave` fue 169–187 unidades, según la longitud de la clave. Las claves fijas vacías son del orden de decenas o pocos cientos de unidades salvo los dos snapshots. Los arrays de progreso/historial dominan el crecimiento histórico.

### Clases de datos

- **Imprescindibles mientras hay partida activa:** snapshot Daily/Infinite y `CaseSave` correspondiente; `CaseSave` Normal para cada expediente empezado.
- **Suspendidos:** los mismos datos después de cerrar/recargar. Infinite y Normal siguen accesibles; Daily solo durante su misma fecha civil.
- **Completados:** progreso, historial, estadísticas y logros. El tablero resuelto no es necesario para la UX actual.
- **Abandonados:** Infinite se elimina explícitamente; Normal al volver atrás se considera suspendido, no abandonado; Daily no tiene abandono explícito.
- **Histórico:** progreso Daily, estadísticas Infinite, historial de investigaciones y logros.
- **Cache reconstruible:** los tres `Map` de generación y el precache Workbox. No deben confundirse con saves.
- **Memoria efímera:** undo, modales, selección y `previousSeed`. No sobreviven a recarga.

## 2. Ciclo de vida real

### Normal

1. Abrir el caso carga el `CaseSave` y el efecto crea/actualiza su clave, incluso vacío.
2. Cada movimiento reescribe el objeto completo. Recargar o cerrar restaura el tablero, ayudas y checkpoints.
3. Navegar a otro caso/dificultad conserva el anterior; pueden coexistir varios Normal suspendidos.
4. “Reiniciar” solo vacía tablero y descartes. Conserva checkpoints, ayudas y comprobaciones; el efecto persiste ese estado.
5. Completar escribe `normal-progress`, después `investigation-history`, borra el `CaseSave` y finalmente reconcilia logros. No existe transacción.
6. La ruta histórica `/case/case001` usa progreso global y no borra el save al completar.
7. El reset debería borrar los saves, pero actualmente deja `case002`…`case015` y `case-d2-01`…`case-d2-06`.

Normal está limitado por el catálogo accesible (21 casos publicados). D3–D5 medidos abajo son descriptores congelados de tooling, no rutas publicadas actuales.

### Daily

1. La pantalla carga la única sesión si el snapshot corresponde a la fecha civil local actual.
2. Empezar genera, valida y guarda primero el snapshot V2. Si esa escritura falla, retorna `null` y no abre el caso.
3. El tablero mutable se guarda aparte bajo `mystery-cases-daily-YYYY-MM-DD-dN-g7`.
4. Recarga/cierre durante el mismo día restaura snapshot y tablero sin llamar al generador.
5. Completar escribe primero `mystery-cases-progress`, luego historial y logros. No borra ni sesión ni `CaseSave`.
6. Tras medianoche, una pantalla de juego ya montada conserva la sesión antigua. Si se abandona, `loadDailySession` exige la fecha nueva y ya no permite recuperar el Daily anterior.
7. Al iniciar el nuevo Daily se sobrescribe la única sesión; el viejo `CaseSave` queda huérfano permanentemente.

Por tanto, un Daily finalizado y uno inconcluso que cruza de día terminan igual respecto al tablero: una clave histórica sin consumidor. La diferencia útil queda en progreso/historial solo si se completó.

### Infinite

1. Sin sesión, la UI obtiene un `uint32` y crea un snapshot `active`.
2. Recargar/cerrar restaura exactamente ese snapshot y su `CaseSave`.
3. No puede iniciarse otro Infinite mientras haya sesión, aunque esté completada.
4. Completar escribe, en orden: sesión `completed`, stats de Infinite, historial y logros. El `CaseSave` sigue existiendo.
5. Cerrar el modal cambia la UI a la pantalla completada. “Generar otro” borra save y sesión; entonces puede elegirse otro caso.
6. “Descartar” pide confirmación y borra save y sesión. Las estadísticas históricas no cambian.

En el flujo normal hay como máximo una sesión y un `CaseSave` Infinite. Una caída entre las dos operaciones de borrado puede dejar una de las claves; una carrera entre pestañas puede dejar además el save de la pestaña perdedora.

### Migraciones y actualización

- `CaseSave` V1–V3 se normaliza a V4; checkpoints/contador solo existen en V4. La reescritura ocurre cuando `GameScreen` vuelve a guardar.
- Normal progress V1 se interpreta como V2 y se escribe en la próxima mutación.
- Daily e Infinite V1 se regeneran una sola vez, validan y reemplazan inmediatamente por snapshot V2. Si reconstrucción/escritura falla, se intenta retirar la sesión legacy de forma segura.
- Snapshot V1 lleva el caso completo y assets por ID. Carga sin regenerar, admite un `generatorVersion` histórico positivo y vuelve a validar estructura, identidad, seed y culpable.
- Una actualización PWA solicita confirmación y recarga mediante `registerSW`; `localStorage` no se migra ni limpia. El cache viejo sí se limpia mediante Workbox.
- Una actualización normal de la APK debería conservar datos de aplicación, pero no existe E2E que lo demuestre. Borrar datos o desinstalar normalmente elimina el WebView local; `allowBackup=true` hace que una restauración posterior dependa del sistema. Desinstalar una PWA no ofrece en el código una garantía sobre borrado o conservación del storage del sitio.

## 3. Tamaños reales D1–D5

La medición serializó ejemplos reales. “Activo” usa media plantilla colocada, descartes equivalentes al 15 % del tablero y tres checkpoints. “Máximo” usa solución completa, todos los descartes legales, 20 checkpoints y longitudes máximas de nombre/descripción. Incluye la clave.

| Modo | D | ID de ejemplo | Activo | Máximo | Snapshot/envelope |
| --- | ---: | --- | ---: | ---: | ---: |
| Normal | 1 | `case001` | 1.887 | 25.665 | — |
| Normal | 2 | `case-d2-01` | 2.282 | 31.695 | — |
| Normal* | 3 | `normal-d3-c01-g7` | 2.524 | 39.345 | — |
| Normal* | 4 | `normal-d4-c01-g7` | 3.016 | 48.543 | — |
| Normal* | 5 | `normal-d5-c01-g7` | 3.196 | 57.258 | — |
| Daily | 1 | `daily-2026-01-01-d1-g7` | 1.954 | 25.365 | 7.537 |
| Daily | 2 | `daily-2026-01-02-d2-g7` | 2.362 | 32.799 | 8.403 |
| Daily | 3 | `daily-2026-01-03-d3-g7` | 2.530 | 40.233 | 10.405 |
| Daily | 4 | `daily-2026-01-04-d4-g7` | 3.022 | 48.549 | 12.700 |
| Daily | 5 | `daily-2026-01-05-d5-g7` | 3.194 | 57.243 | 16.418 |
| Infinite | 1 | `infinite-d1-s287387969-g7` | 1.957 | 25.368 | 7.621 |
| Infinite | 2 | `infinite-d2-s304230978-g7` | 2.365 | 31.920 | 8.906 |
| Infinite | 3 | `infinite-d3-s321073987-g7` | 2.533 | 39.354 | 11.806 |
| Infinite | 4 | `infinite-d4-s337916996-g7` | 3.025 | 47.670 | 13.043 |
| Infinite | 5 | `infinite-d5-s354760005-g7` | 3.201 | 57.246 | 17.056 |

\* D3–D5 Normal no están publicados; se midieron descriptores congelados existentes para comparar geometrías. Los snapshots coinciden con el rango previo documentado (aprox. 7,5–17,1 KB UTF-8). Los máximos son estados legales extremos, no uso típico.

## 4. Crecimiento y cuota

### Modelo

- Daily representativo: promedio D1–D5 de `CaseSave`, más arrays exactos de progreso/historial y un único snapshot actual.
- Infinite: un snapshot y un save activo acotados; después de “Generar otro”, solo crecen `player-stats` e `investigation-history`.
- Ocasional: 2 casos por semana. Diario: 1 por día. Intensivo Infinite: 10 por día.
- Un Daily intensivo no puede crear más de un ID distinto por fecha, por lo que “diario” ya es su máximo normal.
- No se incluyen opciones/logros/Normal porque son pequeños y acotados, ni los 110 MiB del precache porque Cache Storage es un backend separado.

| Horizonte | Daily ocasional | Daily diario | Infinite ocasional | Infinite diario | Infinite intensivo |
| --- | ---: | ---: | ---: | ---: | ---: |
| 30 días | 34.869 u. (8 casos) | 100.377 u. | 17.502 u. (8) | 25.786 u. (30) | 127.434 u. (300) |
| 90 días | 85.393 u. (25) | 278.697 u. | 23.903 u. (25) | 48.372 u. (90) | 353.324 u. (900) |
| 1 año | 320.181 u. (104) | 1.095.997 u. | 53.644 u. (104) | 151.905 u. (365) | 1.388.656 u. (3.650) |
| 3 años | 938.357 u. (312) | 3.265.557 u. | 131.952 u. (312) | 426.741 u. (1.095) | 4.136.970 u. (10.950) |

“u.” significa unidades de código de clave+valor. La mayoría del JSON es ASCII: UTF-8 es cercano a esa cifra; una contabilidad UTF-16 de dos bytes por unidad daría aproximadamente 6,23 MiB para Daily diario a tres años y 7,89 MiB para Infinite intensivo. No debe compararse una cifra con una cuota concreta sin medir ese navegador/WebView.

El repositorio no define ni detecta cuota, no usa `navigator.storage.estimate()`/`persist()`, no hace compactación y no tiene backend alternativo. El límite práctico es, por tanto, el que imponga cada navegador o Android WebView. El precache PWA exacto es 112.857,46 KiB y comparte el almacenamiento global del origen aunque no la API `localStorage`; puede influir en presión/evicción según el motor, algo no probado aquí.

### Escrituras y fallos

| Caso | Comportamiento observado |
| --- | --- |
| Cuota/objeto demasiado grande en snapshot Daily/Infinite | `setItem` lanza; el helper lo captura y devuelve `null`. El valor anterior queda intacto en el adaptador atómico de prueba. La UI no explica la causa |
| Cuota en `CaseSave`, progreso, historial, stats, logros u opciones | La excepción se propaga. No hay banner, retry, fallback ni degradación controlada |
| Interrupción de una clave | Cada registro se entrega en un único `setItem` síncrono; no hay estado parcial JSON construido por la app. No existe verificación post-escritura |
| Interrupción entre claves | No hay transacción. Puede quedar una finalización parcial o un borrado parcial |
| Reset interrumpido | Un `removeItem` que falla aborta el bucle; la prueba dejó 2 de 3 claves. La UI no muestra inventario ni reintenta |
| Datos corruptos | Las lecturas retornan defaults/`null` sin crash. En la prueba, las tres cadenas corruptas permanecieron almacenadas |
| Segundo plano/cierre abrupto | Los movimientos dependen de un `useEffect`; no hay flush en `pagehide`/`visibilitychange`. Una muerte entre el cambio React y el efecto puede perder el último cambio. La comprobación de posición sí guarda inmediatamente |
| Dos pestañas | No hay listener `storage`, lock, CAS ni transacción. Dos read-modify-write pueden perder el cambio de la primera; dos sesiones iniciadas a la vez dejan ganar a la última y pueden crear saves huérfanos |

La atomicidad es solo por clave y depende del contrato del backend. No existe atomicidad de negocio, journal, backup del valor anterior, checksum, confirmación de lectura ni recuperación automática. La prueba no escribió en el storage personal del usuario.

## 5. Hallazgos clasificados

### ALTO-1 — Reset incompleto de saves Normal manuales

- **Ubicación:** `src/game/persistence/resetProgress.ts:11-15`; IDs reales en `src/data/cases/manualNormalCases.ts`.
- **Evidencia:** tras guardar `case001`, `case002`, `case015`, `case-d2-01` y `case-d2-06` en un `Storage` aislado, reset solo eliminó `case001`.
- **Escenario/impacto:** el usuario elige “Borra todas las partidas” y luego encuentra tableros Normal antiguos; incumple la promesa de UI y retiene datos que pidió borrar.
- **Probabilidad:** alta para cualquier jugador que haya abierto C02–C15 o D2 y use reset.
- **Solución mínima posterior:** derivar las claves borrables de los IDs de catálogo publicados/legacy además de los patrones procedurales; test con todos los 21 casos reales.
- **Alternativa:** mantener un índice versionado de saves propiedad de la app y borrar solo lo indexado.
- **Decisión de producto:** ninguna para corregir la promesa actual; sí decidir si reset conserva o borra históricos exportables futuros.

### ALTO-2 — Finalización multiclave no recuperable ante cuota

- **Ubicación:** `GameScreen.tsx:164-165`, `DailyScreen.tsx:23`, `InfiniteScreen.tsx:40`, `NormalCaseScreen.tsx:41-47`.
- **Evidencia:** todas las funciones de progreso/history/stats escriben arrays completos y lanzan. Infinite persiste `completed` antes de stats; Daily persiste el completion global antes del historial.
- **Escenario/impacto:** si falla una escritura posterior, la UI de Daily/Infinite queda sellada como completada y no reejecuta lo que falta tras recarga. Estadísticas, logros o historial quedan permanentemente incompletos.
- **Probabilidad:** baja hoy, creciente con los arrays sin límite; impacto alto.
- **Solución mínima posterior:** operación idempotente de finalización con un registro pendiente/reconciliable, orden explícito y UI de error; tests que fallen en cada escritura.
- **Alternativas:** una única clave transaccional; IndexedDB; o reconciliación determinista desde un ledger local.
- **Decisión de producto:** qué dato es autoridad: acceso/completion, historial detallado o estadísticas.

### ALTO-3 — Retención Daily ilimitada y sin manejo de cuota

- **Ubicación:** `DailyScreen.tsx:23`, `GameScreen.tsx:64-67`, `dailySession.ts`, `resetProgress.ts`.
- **Evidencia:** completar o cruzar medianoche no borra el `CaseSave`; no existe ruta histórica que lo consuma. Proyección representativa: 3.265.557 unidades a tres años de uso diario.
- **Escenario/impacto:** saves huérfanos ocupan la cuota hasta que una escritura falla; esa excepción no se trata en `saveCase`.
- **Probabilidad:** segura a horizonte suficientemente largo para cualquier cuota finita; horizonte exacto dependiente de plataforma.
- **Solución mínima posterior:** borrar el tablero Daily al completar y decidir TTL para Daily inconclusos inaccesibles, protegiendo siempre la sesión actualmente cargable.
- **Alternativas:** archivo histórico reabrible; compactación a resumen; limpieza LRU bajo umbral.
- **Decisión de producto:** si un Daily incompleto de ayer debe poder reabrirse y cuánto detalle histórico se desea.

### MEDIO-1 — Reintentos opacos y estadísticas incompletas

- **Ubicación:** `daily/generator.ts:19-29`, `generation/proceduralCase.ts:19-29`, `generation/generator.ts:19-101`.
- **Evidencia:** `catch { continue }` elimina stage, tipo, mensaje y tiempo. El resultado conserva solo `seedOffset`, stats del puzzle aceptado y `scenarioAttempts` del último escenario. `stats.solverCalls` tampoco cuenta el `solveCase` adicional sin `maxNodes` de `analyzeCase`.
- **Impacto:** una degradación puede aumentar offsets y latencia sin fallos de tests funcionales. D5 ya mostró colas largas.
- **Solución mínima posterior:** rechazo tipado y acumulador estructurado que no consuma PRNG ni cambie control de flujo.
- **Tests:** fingerprints antes/después; límites de p95, offset, causa y fallos por g-versión.
- **Decisión:** qué métricas locales conservar y durante cuánto tiempo.

### MEDIO-2 — Last-write-wins entre pestañas y carreras de sesión

- **Ubicación:** todos los `load*` + `save*`; ausencia de coordinación en `App`/persistencia.
- **Evidencia:** arrays y objetos se leen, modifican y reemplazan completos. No hay `storage` listener ni versión de revisión.
- **Impacto:** pérdida silenciosa de movimientos, completions o estadísticas; posibles saves huérfanos al iniciar dos sesiones.
- **Solución mínima posterior:** detectar cambios externos, incluir revisión y rechazar/mezclar escrituras obsoletas; o documentar una sola pestaña.
- **Decisión:** soportar oficialmente multitabs o bloquear/advertir.

### MEDIO-3 — Reset y borrados no son tolerantes a fallo

- **Ubicación:** `resetProgress.ts:18-21`, `caseSave.ts:43`, `infiniteSession.ts:108`, callbacks de `InfiniteScreen`.
- **Evidencia:** un `removeItem` inyectado abortó el reset dejando dos claves. Borrar save y luego sesión tampoco es atómico.
- **Impacto:** estado parcial y mensaje de UX falso/incompleto.
- **Solución mínima:** planificar inventario, ejecutar borrados idempotentes, recoger fallos y verificar al final; nunca borrar una sesión activa fuera del alcance elegido.

### MEDIO-4 — PWA/Android empaquetados pero lifecycle real no cubierto

- **Ubicación:** `PwaUpdatePrompt.tsx`, `vite.config.ts`, `AndroidManifest.xml`.
- **Evidencia:** build, SW, Pages, sync, verificador Android y APK pasan; no hay test sobre PWA instalada, actualización con partida activa, process death de WebView, clear-data, backup/restore o reinstalación.
- **Impacto:** la lógica compartida parece correcta, pero la retención de plataforma no está demostrada. El precache de ~110 MiB añade presión significativa.
- **Solución mínima:** matriz E2E con una partida activa conocida y fingerprint antes/después de update, kill/reopen y offline.
- **Decisión:** garantía oficial tras desinstalar/reinstalar y uso de backup Android.

### BAJO-1 — Repetición histórica Infinite no evitada

- **Ubicación:** `infiniteSession.ts:109`, `playerStats.ts:49-52`.
- **Evidencia:** solo compara con `excludedSeed`; historial existente no se consulta. 130 duplicados en un millón de seeds de prueba uniforme.
- **Impacto:** un usuario puede recibir el mismo caso D+seed; el ID lo deduplica en stats, pero historial incrementa runs y la UI no avisa.
- **Probabilidad:** muy baja en uso normal; crece por cumpleaños con historiales enormes.
- **Solución mínima si producto la desea:** reintentar contra un conjunto reciente acotado.

### BAJO-2 — Raw inválido y claves legacy pueden ocupar espacio indefinidamente

- **Ubicación:** loaders de persistencia; Daily V2 stale/invalid; patrones de reset.
- **Evidencia:** loaders fallan de forma segura, pero no ponen en cuarentena ni borran. La prueba dejó los raws corruptos intactos.
- **Impacto:** consumo residual y diagnóstico pobre, no corrupción activa.
- **Solución mínima:** inventario/versionado y limpieza solo tras validación y decisión de retención.

### CORRECTO

- Snapshots V2/V1 restauran sin regenerar y validan IDs, seed, assets, estructura, solver y culpable.
- La persistencia mutable no duplica el snapshot inmutable.
- Los loaders capturan JSON corrupto y no crashean al leer.
- Los IDs Infinite validan dificultad y rango `uint32`; no se detectó path traversal porque no hay filesystem y los consumidores productivos construyen IDs internos.
- La normalización selecciona campos y no se observó una vía de prototype pollution. `CaseSave` vuelve a validar con `GameCase` al montar.
- Reset conserva opciones y claves ajenas deliberadamente.
- Los fingerprints g7 de las diez seeds de regresión siguen exactos.

## 6. Reintentos del generador

### Bucles y límites exactos

1. Daily y el generador procedural compartido prueban hasta **100 offsets**: `(baseSeed + offset) >>> 0`.
2. Cada offset llama al generador de escenario, que prueba hasta **100 escenarios internos**.
3. Cada template comprueba placement con hasta **10.000 nodos/intentos**; el puzzle repite placement con el mismo límite.
4. En puzzle procedural: máximo **10 llamadas solver contabilizadas**, **4.000 nodos por llamada**, **8 refinamientos**, **2.000 evaluaciones de candidatos** y **160 pruebas de minimización**. Daily/Infinite pasan `minimizeClues:false`, por lo que las 160 no se usan en runtime.
5. Después se validan definición, unicidad/canónica mediante `analyzeCase`, culpable y calidad humana. `analyzeCase` hace otra llamada solver no incluida en `GenerationStats` y sin el límite procedural de 4.000 nodos.
6. No hay algoritmo de fallback distinto. Operativamente, aceptar un offset mayor que cero es la única recuperación/fallback.

Motivos posibles: layout/objetos/edges/traits/template/placement inviables; falta de pistas mínimas o avanzadas; ningún clue elimina contraejemplos; contradicción/no unicidad/canónica distinta; budgets de solver, refinamiento o evaluación; validación estructural; análisis; culpable; calidad humana. Los `catch` externos silencian la excepción concreta. Al agotar 100 offsets, Daily lanza un mensaje genérico en español e Infinite/procedural uno genérico por dificultad.

Daily e Infinite usan el mismo núcleo y filtro de calidad equivalente. Solo cambian origen/identidad de seed, copy e IDs. Las diferencias D1–D5 nacen de tamaño, catálogo de clues, globals, edges y traits.

### Metodología temporal

- Test Vitest temporal eliminado tras la medición.
- Muestra adicional: 340 casos; Daily usa fechas consecutivas desde 2027-01-01, Infinite la fórmula determinista de `verifyClueQuality`.
- N: 40 por modo en D1–D3, 30 en D4 y 20 en D5 para no ocultar pero acotar el coste D5.
- Un mock envolvió la implementación real de `solveCase` con `performance.now()` y devolvió exactamente su resultado. No hizo draws aleatorios ni cambió ramas.
- Se reprodujo el pipeline externo para conservar orden y capturar stage/mensaje antes del `catch` opaco.
- Las diez seeds de regresión se ejecutaron además mediante `proceduralFingerprint.test.ts`; hashes exactos.
- Tiempos corresponden a esta máquina/carga, no son SLA.

### Resultados por modo y dificultad

| Modo | D | N | Intentos total | Media / mediana / p95 / máx. | Con offset | Tiempo media / p95 / máx. ms | Solver media / cuota / máx. ms |
| --- | ---: | ---: | ---: | --- | ---: | --- | --- |
| Daily | 1 | 40 | 118 | 2,95 / 2 / 5 / 14 | 28 (70 %) | 7,15 / 22,97 / 29,41 | 2,59 / 36 % / 18,54 |
| Daily | 2 | 40 | 132 | 3,30 / 2 / 9 / 10 | 26 (65 %) | 12,10 / 30,07 / 39,29 | 4,26 / 35 % / 17,83 |
| Daily | 3 | 40 | 89 | 2,23 / 1 / 5 / 7 | 19 (48 %) | 50,74 / 104,33 / 419,61 | 38,87 / 77 % / 401,40 |
| Daily | 4 | 30 | 92 | 3,07 / 2 / 7 / 15 | 18 (60 %) | 249,71 / 892,01 / 1.731,54 | 221,80 / 89 % / 1.569,01 |
| Daily | 5 | 20 | 114 | 5,70 / 4 / 14 / 30 | 17 (85 %) | 845,74 / 1.849,45 / 6.128,45 | 768,61 / 91 % / 5.731,37 |
| Infinite | 1 | 40 | 147 | 3,68 / 2 / 9 / 13 | 31 (78 %) | 7,02 / 16,52 / 25,72 | 2,76 / 39 % / 13,12 |
| Infinite | 2 | 40 | 112 | 2,80 / 2 / 8 / 13 | 28 (70 %) | 13,11 / 50,82 / 70,16 | 5,30 / 40 % / 39,97 |
| Infinite | 3 | 40 | 110 | 2,75 / 2 / 8 / 11 | 28 (70 %) | 82,01 / 296,11 / 458,43 | 67,47 / 82 % / 379,32 |
| Infinite | 4 | 30 | 97 | 3,23 / 3 / 7 / 11 | 20 (67 %) | 341,34 / 1.480,74 / 1.803,73 | 310,12 / 91 % / 1.737,82 |
| Infinite | 5 | 20 | 104 | 5,20 / 3 / 15 / 16 | 16 (80 %) | 895,15 / 2.573,85 / 2.877,66 | 821,75 / 92 % / 2.696,27 |
| **Total** | — | **340** | **1.115** | **3,28 / 2 / 9 / 30** | **231 (68 %)** | **174,81 / 1.043,06 / 6.128,45** | **154,75 / 89 % / 5.731,37** |

Hubo 340 éxitos, 0 fallos definitivos y 775 rechazos: 651 “ninguna pista legible elimina contraejemplos”, 58 budget de refinamiento, 54 budget de evaluación de candidatos, 10 falta de pista positiva de objeto y 2 budget de nodos solver. No apareció agotamiento del generador de escenario ni del bucle de 100 offsets.

El total instrumentado fue 59.434 ms; solver, 52.615 ms. Se observaron 5.224 llamadas reales a `solveCase` (media 15,36 por solicitud, p95 43, máximo 159), mientras el intento finalmente aceptado informó solo 4,28 llamadas de media. Esto cuantifica cuánto diagnóstico se pierde hoy.

Seeds problemáticas principales:

- Daily D5 `2027-01-18`, base `4163745040`: offset 29, 30 candidatos, 32 intentos de escenario, 6.128 ms, 5.731 ms de solver, 159 llamadas.
- Infinite D5 `54384793`: offset 8, 2.878 ms, 2.696 ms de solver.
- Infinite D5 `1506496428`: offset 15, 2.574 ms, 2.393 ms de solver.

## 7. Observabilidad sin backend

| Opción | Valor / coste | Rendimiento y determinismo | Privacidad | Entorno recomendado |
| --- | --- | --- | --- | --- |
| `GenerationDiagnostics` estructurado por solicitud | Muy alto; cambio moderado | Contadores/timers fuera del PRNG no cambian fingerprints; medir tiene coste pequeño | Bajo si no guarda caso, narrativa ni solución | Producción y tests |
| Rechazos tipados por stage/código | Muy alto; coste moderado al sustituir excepciones genéricas | Sin impacto si preserva exactamente control de flujo | Nulo | Producción, dev y tests |
| Histograma local agregado por g-versión/modo/D | Alto; coste bajo y tamaño acotable | Sumas, buckets de offset/tiempo; no guardar orden ni seeds | Muy bajo; solo agregado local | Producción, opt-out no necesario si nunca sale del dispositivo |
| Log detallado de últimos N intentos | Alto para bugs; coste/tamaño medio | Puede añadir asignaciones; no debe tocar RNG | Evitar seed por defecto; una seed permite reconstruir el puzzle aunque no sea dato personal | Solo desarrollo; exportación manual explícita |
| Exportar diagnóstico | Alto para soporte | Serialización fuera del camino de generación | Incluir versión, modo, D, timings y códigos; excluir textos, solución, roster, timestamps precisos e identidad | Acción manual del usuario |
| Umbrales CI | Muy alto contra regresiones | Muestras fijas; tiempos son sensibles a máquina, offsets/causas más estables | Nulo | Tests/CI |
| Logs `console` | Útil localmente, pobre como histórico | Ruido y coste si producción | Pueden acabar en herramientas externas | Solo `development` |
| Panel de `storage.estimate()` | Alto para cuota; coste bajo | No afecta generación | Bajo; mostrar localmente, no enviar | Producción |

Campos mínimos sugeridos: `generatorVersion`, modo, dificultad, resultado, candidatos probados, offset aceptado, intentos internos de escenario acumulados, contadores por `RejectionCode`, solver calls totales, tiempo total/solver, máximos alcanzados y `usedOffsetFallback`. El acumulador debe crearse fuera de la secuencia aleatoria y no persistir raws ilimitados.

Umbrales iniciales deben basarse en distribución y no en una máquina concreta: 0 fallos en muestra fija; p95 de offset/intent count por dificultad; ausencia de nuevas causas desconocidas; fingerprints exactos. Los límites de tiempo conviene monitorizarlos como tendencia o en runner dedicado.

## 8. Seeds Infinite y colisiones

### Contrato actual

- Fuente: `crypto.getRandomValues(new Uint32Array(1))`.
- Espacio: 2³² = 4.294.967.296 valores, incluidos 0 y 4.294.967.295.
- Normalización: el valor ya es `uint32`; sesión/snapshot/IDs vuelven a validar el rango.
- No incorpora fecha, hora, dificultad, contador ni usuario.
- Puede compartirse seed entre dificultades. No implica el mismo caso porque D altera tablero, roster y reglas; los IDs incluyen `dN`.
- Misma dificultad + misma seed + mismo generador/catálogos produce el mismo caso e ID. Otra versión del generador puede producir otro caso, aunque los snapshots existentes preservan el original.
- `player-stats` conserva todos los IDs resueltos y `investigation-history` conserva cada ID lógico, pero `createInfiniteSeed` no los consulta.
- El ID detecta la repetición después del hecho: stats deduplica el ID, mientras historial suma otra completion sobre el mismo registro.
- Se intenta hasta ocho veces solo para evitar `excludedSeed`. En la UI, esa exclusión recuerda el caso anterior al pulsar “Generar otro”; no es un conjunto histórico.

### Prueba reproducible

Se llamó un millón de veces a la función real `createInfiniteSeed(previous)` sustituyendo temporalmente `crypto.getRandomValues` por SplitMix64-low32 con estado fijo `0x6d2b79f5a4b3c2d1`. Esto prueba el manejo de la función con una secuencia reproducible de 32 bits; no certifica la implementación criptográfica del sistema operativo.

- Resultados: 1.000.000.
- Draws raw: 1.000.000; reintentos inmediatos: 0.
- Únicos: 999.870; duplicados observados: 130.
- Buckets por byte alto: mínimo 3.756, máximo 4.099, esperado 3.906,25; χ² 308,48 con 255 grados de libertad. Es una comprobación básica, no una certificación estadística.
- Pares de colisión esperados bajo uniformidad: `n(n-1)/(2·2^32)` = 116,42.
- Probabilidad de al menos una colisión en un conjunto: aproximadamente 0,0116 % a 1.000 casos, 1,16 % a 10.000, 25,3 % a 50.000 y 68,8 % a 100.000.
- Probabilidad de que el siguiente draw coincida con alguno de `h` históricos: `h/2^32`; para 1.000 es 0,0000233 % y para 10.000 es 0,000233 %.

La prueba muestra el efecto cumpleaños a gran escala, no un riesgo frecuente por usuario. Tampoco mide sesgos de `crypto.getRandomValues`; el contrato esperado es uniforme y la fuente real no se alteró.

### Alternativas

| Alternativa | Ventaja | Riesgo/coste | Fingerprints y compatibilidad |
| --- | --- | --- | --- |
| No hacer nada | Cero complejidad; riesgo humano diminuto | Una repetición es posible y no se explica | No cambia nada |
| Recordar últimas 64–256 seeds y reintentar solo al coincidir | Evita repetición perceptible reciente con pocos bytes | Nueva clave/política y manejo de cuota/corrupción | No cambia el caso para una seed ni snapshots; sí cambia qué seed futura se selecciona |
| Consultar todo `player-stats` | Evita cualquier repetición resuelta local | Búsqueda/crecimiento ilimitado; no cubre abandonados; empeora retención | Igual que anterior; preserva fingerprints por entrada |
| Contador local + entropía | Reduce dependencia de azar para unicidad local | Sincronización multitabs, reset/backup y combinación bien definida | Cambia selección futura, no el generador dado un uint32 |
| Cambiar fuente manteniendo uint32 | Puede facilitar test/inyección | No mejora matemáticamente el espacio si sigue uniforme | Cambia selección futura; snapshots/IDs existentes válidos |
| Ampliar a 64 bits | Reduce radicalmente colisiones | Rompe validadores, schema, IDs, snapshot y operaciones JS actuales | Cambio incompatible que exige migración/versionado |

La opción proporcional, si producto exige “no repetir recientemente”, es un set acotado y retry solo al detectar coincidencia. No hay evidencia para exigir unicidad histórica ilimitada.

## 9. Alternativas de retención

### A. Mínima y acotada

- Conservar siempre settings, completions, logros, historial compacto, sesiones activas y saves Normal incompletos.
- Borrar `CaseSave` Daily al completar; eliminar Daily inconclusos cuando ya no sean accesibles tras un TTL corto definido por producto.
- Mantener solo una sesión/save Infinite, como hoy; compactar histórico detallado por antigüedad o cantidad.
- Ventajas: poco cambio de UX y fuerte reducción de cuota.
- Riesgos: impide una futura función de reabrir Daily antiguos; requiere distinguir con precisión activo/completado.
- Compatibilidad: alta. Es la base técnica más simple, pero el TTL no debe elegirse sin decisión de producto.

### B. Archivo local completo y control del usuario

- No borrar automáticamente. Añadir pantalla de uso, limpieza por modo/fecha, exportación y aviso de cuota.
- Ventajas: máxima conservación y repetición/revisión futura.
- Riesgos: el crecimiento continúa; necesita UX, export/import y manejo robusto de cuota.
- Datos perdidos: solo los elegidos explícitamente.
- Compatibilidad: máxima con la retención actual, pero no resuelve por sí sola el límite finito.

### C. Retención por capas

- Nunca borrar partida activa. Conservar detalle de saves/historial por 90 días o N entradas; después reducir a agregados necesarios para estadísticas/rachas/logros. Guardar recientes Infinite para antirrepetición.
- Ventajas: historial útil y tamaño predecible.
- Riesgos: mayor complejidad de migración, agregados y explicación al usuario; una poda incorrecta puede afectar rachas/logros.
- Datos perdidos: detalle por run y tableros antiguos, no totals/logros si el agregado está bien diseñado.
- Compatibilidad: media; requiere versión nueva y tests de equivalencia estadística.

### Decisiones de producto pendientes

1. ¿Un Daily de ayer sin terminar debe ser irrecuperable, reabrible o conservarse N días?
2. ¿Se quiere reabrir/ver un Daily completado o solo conservar su completion, racha y rendimiento?
3. ¿El historial detallado Infinite tiene valor más allá de estadísticas agregadas?
4. ¿“Resetear progreso” debe borrar también opciones, exports, diagnóstico local y sets recientes de seed?
5. ¿Se soportan varias pestañas o se declara sesión única?
6. ¿Qué garantía se promete al desinstalar/reinstalar PWA o APK? ¿Se desea backup Android?
7. ¿Se quiere evitar solo la seed inmediatamente anterior, las N recientes o toda seed resuelta?
8. ¿Qué umbral de storage debe activar aviso, compactación voluntaria o bloqueo de nueva partida?
9. ¿Qué fuente es autoridad en una finalización parcial y cómo se comunica/repara?

Una política segura debe declarar que **nunca** se elimina automáticamente la sesión actualmente cargable ni el `CaseSave` que la acompaña. Settings, logros y completions compactos son datos pequeños y valiosos; no hay motivo técnico para podarlos hoy. Los tableros Daily huérfanos son el primer candidato claro a limpieza.

## 10. Plan de implementación por fases

1. **Corrección aislada del reset.** Incluir todos los IDs manuales reales, testear los 21 publicados, fallo parcial e idempotencia. Sin tocar retención automática.
2. **Contrato de escritura y cuota.** Wrapper tipado de storage, resultado `ok/quota/unavailable/corrupt`, estimación local y UI de error. Mantener el save anterior hasta confirmar el nuevo.
3. **Finalización recuperable.** Evento/ledger idempotente o reconciliación; fault-injection en cada paso para Normal, Daily e Infinite.
4. **Decisión y migración de retención.** Implementar A, B o C con dry-run/inventario, protección de activos y versión de política. Tests con legacy/corruptos.
5. **Observabilidad procedural.** Diagnóstico estructurado, causas tipadas y agregados acotados. Congelar fingerprints antes y después.
6. **Guardas de calidad.** Muestras deterministas por g-versión, thresholds por dificultad, perfil D5 y alertas de nuevas causas/fallos.
7. **Seeds recientes, solo si se decide.** Set acotado, retry, concurrencia y migración; demostrar que una seed dada conserva fingerprint.
8. **E2E de plataforma.** PWA instalada y WebView Android: offline, update, background/kill, cuota, clear-data, backup y reinstalación según garantía elegida.

Cada fase debe ser pequeña, reversible y no mezclar una migración destructiva con cambios de generación.

## 11. Validación ejecutada

| Validación | Resultado exacto |
| --- | --- |
| Rama/estado inicial | `pre`; limpio |
| TypeScript | `npx tsc -b`: correcto, sin diagnósticos |
| Lint | `npm run lint`: correcto; el repositorio usa Oxlint, no tiene script ESLint separado |
| Persistencia/Daily/Infinite/migraciones/fingerprints | 14 archivos, 135 tests correctos, 5,12 s |
| Generador/solver/validator | 10 archivos, 139 tests correctos, 7,81 s |
| Suite completa | 86 archivos, 589 tests correctos, 8,77 s |
| Auditoría procedural | 250 puzzles correctos; D1 375 ms, D2 615 ms, D3 5.044 ms, D4 19.019 ms, D5 42.805 ms |
| Perfil D5 oficial | 20/20 éxitos, 0 fallos; media 876 ms, máximo 2.755 ms (caso 15); 4,4 solver calls aceptadas de media; offset medio 4,2, máximo 15 |
| Casos Normal | 21 casos publicados verificados |
| Instrumentación temporal de retries | 340/340 éxitos; 1.115 candidatos; 775 rechazos; 59,46 s; archivo temporal eliminado |
| Tamaño/cuota/reset | 15 combinaciones modo+D y fault injection correctas; 3 pruebas temporales; archivo eliminado |
| Seeds | 1.000.000 retornadas por `createInfiniteSeed` con fuente determinista; 130 duplicados; prueba temporal eliminada |
| Build web/PWA | Correcto; 450 módulos; 225 entradas, 112.857,46 KiB de precache; warning no bloqueante de chunk >500 kB |
| `verify:pwa` | Correcto |
| `verify:pages` | Correcto; 225 entradas, 112.860,25 KiB |
| `verify:android` | Build + `cap sync android` + verificador: correcto |
| APK debug offline | `BUILD SUCCESSFUL` en 2 s; 93 tareas (24 ejecutadas, 69 up-to-date); 120.176.160 bytes |
| E2E instalada/WebView real | No ejecutable con el arnés actual; queda explícitamente pendiente. No se simuló como si fuera evidencia real |
| Red | No utilizada |
| Storage personal | No leído, llenado, limpiado ni modificado; todos los fallos usaron adaptadores en memoria |
| `git diff --check` antes del informe | Correcto; solo avisos locales LF→CRLF en archivos Capacitor sin diff material |

Avisos no bloqueantes de Gradle: `flatDir` y features deprecadas antes de Gradle 9. El build fue totalmente offline.

## 12. Conclusión

El mecanismo de snapshot resuelve bien la continuidad exacta del caso y no necesita rediseño. El problema operativo está alrededor: propiedad incompleta de claves en reset, finalizaciones multiclave sin recuperación y retención Daily ilimitada. Esos tres puntos deben preceder a cualquier política sofisticada.

El generador es robusto en resultado —la suite permanente de 589 tests y las muestras adicionales dieron cero fallo final—, pero su comportamiento operativo no es observable. Los offsets son habituales, no excepcionales, y D5 está dominado por solver. Añadir diagnóstico estructurado y tests de distribución aportaría más valor que guardar logs narrativos o enviar telemetría.

La repetición Infinite es matemáticamente posible, pero no aparece como riesgo prioritario para el volumen humano esperado. Una protección de recientes es compatible con snapshots/fingerprints por seed y puede añadirse después, únicamente si la UX exige no repetir.
