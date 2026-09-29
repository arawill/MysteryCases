# Generación procedural fuera del hilo principal

## Estado

Arquitectura implementada sobre el protocolo Worker V1. Daily, Infinite y las migraciones legacy intentan generar en un Worker módulo Vite persistente y perezoso. El fallback directo solo se activa ante un error de infraestructura y espera una oportunidad de pintura antes de ejecutar CPU síncrona.

No cambian el generador, solver, evaluadores, RNG, seeds, reintentos, IDs, fingerprints, snapshot procedural V1, envelopes de sesión V2 ni `CaseSave V4`.

## Componentes

| Componente | Responsabilidad |
|---|---|
| `proceduralWorker/protocol.ts` | Tipos V1 y validación estricta de requests, handshake, responses, snapshots, métricas y errores clonables |
| `proceduralWorker/handler.ts` | Handler puro: generación directa, snapshot y validación dentro del Worker |
| `proceduralGeneration.worker.ts` | Adaptador mínimo a `self`, handshake y despacho; no conoce React ni almacenamiento |
| `proceduralWorker/client.ts` | Instancia lazy/persistente, una petición, handshake, cancelación, errores de infraestructura y limpieza |
| `useProceduralGeneration.ts` | Estado UI, exclusión global, fallback, tokens de vida, persistencia y entrega a React |
| `waitForPaint.ts` | Barrera `requestAnimationFrame` + task; ruta de dos tasks si el documento está oculto |
| `legacyMigration.ts` | Inspección y migración Infinite→Daily, sin borrado implícito ante fallo |
| `dailySession.ts` / `infiniteSession.ts` | Validación final y persistencia V2 desde snapshot exclusivamente en main |

## Protocolo

Todas las estructuras usan structured clone; JSON se conserva únicamente para el formato preexistente de `localStorage`.

```text
Worker -> { protocolVersion: 1, type: "ready" }

Main -> Daily:
{ protocolVersion: 1, requestId, mode: "daily", dateKey, difficulty, includeMetrics? }

Main -> Infinite:
{ protocolVersion: 1, requestId, mode: "infinite", seed, difficulty, includeMetrics? }

Worker -> éxito:
{ protocolVersion: 1, requestId, ok: true, snapshot, metrics? }

Worker -> dominio:
{ protocolVersion: 1, requestId, ok: false,
  error: { code, message, retryable } }
```

Se rechazan campos cruzados, extras, versión desconocida, `requestId` vacío, fecha civil inválida, dificultad fuera de D1–D5, seed no entera o fuera de uint32, métricas inválidas y snapshots no restaurables. El entrypoint conserva los IDs vistos y rechaza duplicados. Los errores son objetos de datos; no cruzan callbacks, funciones, stacks ni instancias `Error`.

## Ciclo de vida

1. La pantalla congela fecha/seed y dificultad y crea un `requestId` único.
2. El hook adquiere la exclusión global antes de que pueda ejecutarse un segundo handler.
3. El cliente crea el Worker únicamente en la primera solicitud y valida su handshake, con timeout solo de arranque.
4. La instancia se reutiliza tras cada respuesta correcta o error de dominio.
5. El Worker llama directamente a `generateDailyCase` o `generateInfiniteCase`; nunca usa las APIs cacheadas.
6. El Worker crea y restaura una vez el snapshot para validar su respuesta.
7. Main vuelve a validar modo, fecha/seed, dificultad, ID y snapshot.
8. Main comprueba sesión existente y desbloqueo, construye exactamente el envelope V2, escribe mediante `replaceStorageValue` y solo entonces entrega la sesión a React.

Una sesión V2 existente gana frente a cualquier respuesta posterior. No se muestra `GameScreen` si falla almacenamiento.

## Cancelación e invalidez

`AbortSignal` cancela la petición y termina el Worker, porque el solver síncrono no puede procesar un mensaje de cancelación mientras trabaja. La siguiente petición crea una instancia nueva. Se eliminan listeners, timer de handshake y promesas pendientes.

La pantalla invalida en unmount/navegación y Daily cancela si cambia `dateKey`. Además, inmediatamente antes de persistir, Daily compara la clave congelada con la fecha civil local actual. Una respuesta con ID desconocido u obsoleto se ignora y nunca puede escribir.

Los controles se deshabilitan en el primer render de la petición, y una guarda síncrona anterior a `crypto.getRandomValues` evita crear dos seeds aunque dos handlers entren en el mismo task.

## Errores y fallback

- Infraestructura: Worker ausente, constructor/chunk/handshake/protocolo, `error`, `messageerror` o terminación sin respuesta. Permite fallback con los mismos inputs.
- Dominio: agotamiento de generación, caso imposible o snapshot inválido. Se presenta al jugador y no genera de nuevo automáticamente.
- Persistencia: se distingue de generación y nunca produce sesión de runtime no guardada.
- `crypto.getRandomValues`: se captura en la pantalla Infinite y se presenta como error recuperable.

Antes del fallback visible, main espera un frame y el task posterior. Si `requestAnimationFrame` está suspendido por documento oculto, espera dos tasks y no queda bloqueado indefinidamente. No se añade duración mínima después del resultado. Durante CPU síncrona degradada no se ofrece cancelar.

## UX y accesibilidad

- Daily: “Preparando el caso diario…”
- Infinite: “Generando un expediente…”
- Migración: “Actualizando partida guardada…”
- Región con `aria-busy`, status `role="status"` y `aria-live="polite"`.
- Indicador indeterminado; con `prefers-reduced-motion` se vuelve estático.
- Botón y selector deshabilitados; cancelación solo durante transporte Worker.
- Error con `role="alert"`, `REINTENTAR` con los mismos inputs y `GENERAR OTRO` Infinite con seed nueva.

## Migración V1

`initializePersistence` solo recupera el journal antes de `createRoot`. Si la recuperación falla, el shell bloquea cualquier migración y ofrece reintentar. El shell inspecciona legacy sin regenerar y procesa en orden determinista Infinite→Daily mediante el mismo Worker.

La migración no arranca al montar el efecto: espera explícitamente un frame y el task posterior. De este modo, incluso una generación muy corta no puede sustituir el shell antes de que el navegador tenga oportunidad de pintarlo.

El snapshot se confirma en main conservando fecha, dificultad, seed y status. Un fallo mantiene intacta la metadata V1 y ofrece `REINTENTAR` o `DESCARTAR PARTIDA`; el descarte verifica que el legacy actual coincide exactamente antes de eliminarlo. Una V2 válida no crea Worker.

## Equivalencia

La batería dirigida genera D1–D5 en ambos modos por ruta directa y handler Worker. Snapshot completo y JSON byte a byte coinciden, incluidos seed original/efectiva, offset, culpable, ID, narrativa, tablero, personajes, pistas y referencias de assets. Los fingerprints/RNG/snapshots preexistentes siguen cubiertos por la suite.

## Evidencia de navegador de producción

Edge/Chromium 154 headless, build de producción y una única instancia Worker real:

| Modo | D | total main↔Worker ms | generación Worker ms | snapshot Worker ms | máxima latencia evento main ms |
|---|---:|---:|---:|---:|---:|
| Daily | 1 | 14,1 | 9,1 | 2,3 | 0,4 |
| Daily | 2 | 8,7 | 5,3 | 1,2 | 0,2 |
| Daily | 3 | 20,4 | 16,1 | 1,8 | 1,0 |
| Daily | 4 | 57,3 | 49,0 | 2,8 | 1,3 |
| Daily | 5 | 167,0 | 136,6 | 9,3 | 0,9 |
| Infinite | 1 | 4,7 | 2,3 | 1,0 | <0,1 |
| Infinite | 2 | 5,5 | 3,1 | 1,2 | <0,1 |
| Infinite | 3 | 40,7 | 32,5 | 4,9 | 0,7 |
| Infinite | 4 | 93,6 | 85,5 | 3,3 | 0,8 |
| Infinite | 5 | 683,3 | 673,8 | 3,2 | 1,2 |

Handshake frío: 6,0 ms. En UI Infinite D1 fría, el status apareció 1,8 ms tras el clic, recibió frame a 6,8 ms y `GameScreen` apareció a 33,8 ms con V2 ya persistida. En D2 caliente, status a 0,7 ms y juego a 20,8 ms; terminó antes de un segundo frame, sin retraso artificial. No hubo long tasks de main posteriores al clic; una long task de 117 ms observada al arranque de página ocurrió aproximadamente 1,5 s antes y no pertenece al generador.

Infinite D5 tardó 677 ms dentro del Worker mientras main siguió atendiendo 136 ticks de control, con retraso máximo 1,2 ms. La cancelación D5 mediante `terminate()` volvió a selección y dejó la sesión ausente. En fallback forzado D1, status apareció a 1,0 ms, hubo oportunidad de frame a 1,3 ms y el juego apareció a 28,4 ms con persistencia previa.

Son muestras funcionales, no una nueva distribución estadística. El objetivo demostrado es retirar CPU de main, no reducir el coste total del solver.

## PWA, Pages y Android

La build emite un chunk Worker separado (`proceduralGeneration.worker-*.js`, 95,09 kB en la build web medida). El patrón `new Worker(new URL(..., import.meta.url), { type: 'module' })` deja a Vite resolver el hash y la base. `globPatterns` incluye JS, por lo que la build PWA precacheó 226 entradas, incluido el chunk.

Validación final realizada:

- PWA: `verify:pwa` correcto. Con red desactivada mediante CDP y la página controlada por el Service Worker, Infinite creó el Worker, generó y persistió V2; una recarga todavía offline restauró el juego sin construir un Worker.
- Concurrencia: dos clics en el mismo task consumieron una sola llamada a `crypto.getRandomValues`, construyeron un Worker y publicaron una solicitud.
- Migración: el shell se observó antes del Worker y el legacy Infinite quedó en V2 conservando `status: completed` y seed `98765`.
- Pages: `verify:pages` correcto. En ejecución real bajo `/MysteryCases/`, tanto online como tras recarga offline controlada se creó `http://127.0.0.1:4173/MysteryCases/assets/proceduralGeneration.worker-CbcwK0K6.js`, se persistió V2 y apareció `GameScreen`; `sw.js` precachea la ruta relativa del chunk.
- Android: `verify:android`, `cap sync` y `assembleDebug --offline` correctos. El chunk de 95.097 bytes está en assets y dentro del APK debug (119.590.153 bytes, SHA-256 `E92CE54263D65AE69BB5C99CE64E7A3DFB482C64733F52CB7789673AD3930159`).

No había una PWA instalada ni WebView/emulador/dispositivo accesible. La automatización runtime se realizó en Edge/Chromium real y cubrió el Service Worker offline; background/foreground y process death del runtime instalado/WebView quedan pendientes hasta disponer de esas superficies.

## Rollback

El rollback puede hacerse por capas:

1. Volver las pantallas a `startDailySession`/`startInfiniteSession`; las APIs síncronas siguen presentes.
2. Restaurar el bootstrap síncrono solo si se acepta de nuevo el bloqueo legacy.
3. Retirar `PersistenceBootstrap`, hook, cliente, handler y protocolo.
4. Eliminar los tests Worker y este documento.

No hace falta migrar almacenamiento al revertir: V1/V2, snapshot y `CaseSave` nunca cambiaron.

## Riesgos residuales

- Un cierre silencioso del Worker sin evento no es observable por la API web; no se impone timeout a una generación válida. Errores de carga/crash sí disparan `error`.
- Terminar cancela de verdad, pero pierde el calentamiento de la instancia.
- PWA instalada y Android WebView necesitan pruebas reales de background/foreground, back y process death.
- La disponibilidad offline depende de que main y chunk Worker pertenezcan al mismo despliegue cacheado; un fallo de carga degrada al fallback seguro.
