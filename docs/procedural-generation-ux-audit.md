# Auditoría de rendimiento percibido de Daily e Infinite

Fecha de la auditoría: 29 de septiembre de 2026

Rama: `pre`

Commit auditado: `5759a7121626f2733ca3b3054a8fa3d13194077b` (`perf: use row-major solver cell lookup`)

## Resumen ejecutivo

La creación de casos Daily e Infinite se ejecuta hoy de forma completamente síncrona en el hilo principal. El clic, la generación, el solver, la construcción del snapshot, la serialización, la escritura y la llamada a `setSession` comparten el mismo task. React y el navegador no pueden pintar feedback propio de carga entre esos pasos. La restauración V2, en cambio, no ejecuta el generador y resulta barata en las muestras realizadas.

En un Ryzen 9 7900X con Edge/Chromium 154, las dificultades D1 y D2 no presentan bloqueos problemáticos; D3 tiene colas visibles; D4 y D5 sí producen congelaciones perceptibles. Los máximos medidos desde el clic hasta el primer frame fueron 854,1 ms en Daily D4, 889,4 ms en Daily D5, 847,3 ms en Infinite D4 y 868,8 ms en Infinite D5. El evento de control enviado durante la operación llegó a retrasarse 895,8 ms. Este equipo es más rápido que un móvil típico: los resultados no justifican considerar aceptable la experiencia D4/D5 en PWA o Android.

También existe generación síncrona fuera del clic. Una sesión V1 se regenera al cargarla. `initializePersistence()` se ejecuta antes de `createRoot().render()` y llama primero a `loadInfiniteSession()`: una sesión legacy Infinite puede bloquear toda la aparición de la aplicación. El fixture Infinite D5 empleado añadió 266,3 ms antes de React; la distribución normal de D5 demuestra que otros seeds pueden costar bastante más. Daily legacy puede regenerarse en la limpieza global y, si aún permanece, en el inicializador de `useState` de `DailyScreen`.

La decisión para una tarea posterior es una sola arquitectura: **opción F, Worker módulo persistente y perezoso con fallback síncrono después de pintar el estado de carga**. El Worker ejecutará la generación pura y construirá el snapshot procedural. El hilo principal seguirá siendo propietario de seed/fecha, restauración y validación final, formato V2, `localStorage`, estado React y render. Una identidad de solicitud, invalidación por ciclo de vida y terminación del Worker evitarán resultados tardíos. No se ha implementado nada de esa arquitectura en esta auditoría.

## Alcance, referencia y método

El punto de partida fue una rama `pre` sin divergencia con `origin/pre` (`0 ahead`, `0 behind`). El último commit contiene la tabla row-major adoptada por el solver. Antes de instrumentar pasaron TypeScript, Oxlint y la suite completa (97 archivos y 689 tests). La primera ejecución de Vitest dentro del sandbox falló al arrancar Vite con `spawn EPERM`; la repetición autorizada fuera de esa limitación pasó y no reveló un fallo del proyecto.

La medición primaria usó una build de producción servida localmente y Edge 154 headless en Windows, sin red. Se ejecutaron 20 muestras por combinación de modo y dificultad: 200 creaciones desde un flujo UI instrumentado. Cada muestra partió de almacenamiento limpio, realizó un clic DOM, ejecutó las mismas funciones de producción de generación, snapshot y persistencia, montó el `GameScreen` real, y midió con reloj monotónico, `PerformanceObserver`, `MessageChannel`, `useLayoutEffect` y `requestAnimationFrame`. El arnés reproducía el orden exacto del handler fresco; no sustituyó la generación por el benchmark CLI. Una prueba adicional accionó directamente los botones reales de `DailyScreen` e `InfiniteScreen`.

Entorno de evidencia directa:

- Edge/Chromium 154, Windows x64, Ryzen 9 7900X, 32 GiB, 24 hilos lógicos.
- `crossOriginIsolated: false` y resolución de `performance.now()` del navegador.
- Build de producción para los números publicados; una pasada de desarrollo se usó solo como contraste.
- Muestras calientes dentro de la misma página y proceso, por lo que incluyen calentamiento desigual de JIT/caché y no modelan un arranque frío por caso.
- Daily usó veinte fechas fijas por dificultad; Infinite usó veinte seeds deterministas por dificultad. En Infinite se midió además una llamada real a `createInfiniteSeed`, pero se inyectó el seed fijo en la generación para que la muestra fuera reproducible.
- `p99` equivale al máximo observado porque hay 20 muestras por grupo; no debe interpretarse como un percentil poblacional estable.

No había superficie de navegador interactiva disponible mediante el controlador de interfaz. Se pudo automatizar Edge real por CDP local, pero no una PWA instalada ni un Android WebView/emulador. Por tanto, web/Chromium es evidencia directa; PWA y Android combinan el código y las builds verificadas con inferencias explícitas sobre sus ciclos de vida. No se midieron memoria del proceso, arranque frío del Worker —que todavía no existe—, consumo de batería ni tiempos en hardware móvil.

## Mapa de llamadas y secuencias

### Arranque global

```text
main.tsx
  -> initializePersistence()
       -> recoverStorageTransaction()
       -> loadInfiniteSession()
            -> V2: parsear y restaurar
            -> V1: generateInfiniteCase() -> snapshot -> persistir V2
       -> cleanupDailyRetention()
            -> recoverStorageTransaction()
            -> loadDailySession(fecha retenida)
                 -> V2: parsear y restaurar
                 -> V1: generateDailyCase() -> snapshot -> persistir V2
            -> aplicar transacción de retención
  -> createRoot(...).render(<StrictMode><App /></StrictMode>)
```

`initializePersistence()` es síncrona y se espera antes de crear el root. Si falla la recuperación del journal, devuelve `false`, omite cargas/migraciones y React se renderiza de todos modos porque `main.tsx` no usa el valor. Si hay legacy Infinite y Daily, sus regeneraciones pueden ocurrir secuencialmente antes del primer render, Infinite primero.

### Daily nuevo

```text
click COMENZAR CASO
  -> handler de DailyScreen (captura fecha y dificultad)
  -> startDailySession(fecha, dificultad, progreso)
       -> loadDailySession(fecha) / guard de sesión existente
       -> generateDailyCase(fecha, dificultad)
            -> generación procedural y llamadas al solver
       -> createProceduralCaseSnapshot(caso)
       -> JSON.stringify(envelope V2)
       -> replaceStorageValue(localStorage)
  -> setSession(caso restaurado/runtime)
  -> cleanupDailyRetention(fecha)
  -> commit de GameScreen
  -> primer frame
```

Todo hasta el retorno del handler ocupa un solo task. La limpieza Daily vuelve a cargar/restaurar la sesión recién guardada y explica parte del coste residual, especialmente en D5. `setSession` solo agenda el update; el commit ocurre después de devolver el control al navegador.

### Infinite nuevo

```text
click GENERAR CASO
  -> handler de InfiniteScreen
  -> createInfiniteSeed()                 [fuera del try de startInfiniteSession]
  -> startInfiniteSession(dificultad, seed, progreso)
       -> loadInfiniteSession() / guard de sesión existente
       -> generateInfiniteCase(seed, dificultad)
            -> generación procedural y llamadas al solver
       -> createProceduralCaseSnapshot(caso)
       -> JSON.stringify(envelope V2)
       -> replaceStorageValue(localStorage)
  -> setSession(caso restaurado/runtime)
  -> commit de GameScreen
  -> primer frame
```

La creación criptográfica del seed fue menor o igual a 0,1 ms en todos los grupos. Su relevancia es de consistencia: una excepción sucede antes de la captura de errores de `startInfiniteSession`.

### Restauración V2

```text
localStorage.getItem
  -> JSON.parse
  -> reconocer envelope V2
  -> restoreProceduralCaseSnapshot
       -> validar snapshot y contexto esperado
       -> hidratar IDs de assets
       -> construir/clonar GameCase de runtime
  -> inicializador useState / render de GameScreen
```

Las pruebas existentes y la instrumentación confirman que este camino no llama al generador. La lectura, parseo, validación e hidratación están incluidas en las cifras de carga V2. El coste de React posterior se midió por separado durante creación; no se aisló un commit de reapertura por cada dificultad.

### Migración V1

`loadDailySession` y `loadInfiniteSession` detectan el envelope legacy, regeneran desde su fecha/seed y dificultad, crean un snapshot y reemplazan el registro por V2. Puede ocurrir:

- antes del primer render, desde `initializePersistence`;
- durante `useState(() => loadDailySession(...))` o `useState(() => loadInfiniteSession())` si el dato legacy no fue migrado en el arranque;
- en desarrollo, bajo comprobaciones adicionales de Strict Mode; una primera migración correcta deja V2, por lo que la siguiente lectura no debería regenerar.

Una migración correcta es de una sola vez. Si falla la regeneración, snapshot o persistencia, el loader captura el error y elimina de forma segura el legacy reconocido; no queda un caso parcial, pero se pierde la posibilidad de volver a intentar con esos metadatos. Si la aplicación muere durante CPU, todavía no hay escritura nueva. Si muere después de completar el reemplazo, la siguiente apertura restaura V2. No existe un journal específico para creación/migración de sesión; `replaceStorageValue` verifica la escritura e intenta restaurar el valor anterior ante fallo.

## Mediciones

Todos los tiempos están en milisegundos. `H` es duración del handler; `G` generación completa; `S` solver acumulado; `Snap` snapshot; `Commit` clic a primer commit; `Frame` clic a primer frame; `Evt` retraso del evento de control; `LT` duración máxima de long task observada en la muestra. Cada celda muestra `P50 / P90 / P95 / P99=máx`.

### Daily

| Dificultad | H | G | S | Snap | Commit | Frame | Evt | LT |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 | 5,35 / 14,4 / 20,3 / 26,9 | 4,2 / 13,0 / 18,6 / 26,0 | 1,1 / 3,3 / 3,5 / 5,2 | 0,7 / 0,9 / 1,0 / 1,9 | 6,4 / 17,4 / 22,0 / 27,9 | 12,85 / 19,9 / 25,8 / 28,1 | 6,6 / 18,4 / 22,3 / 28,0 | 0 / 0 / 0 / 0 |
| D2 | 6,55 / 14,5 / 21,0 / 26,3 | 5,05 / 13,1 / 19,5 / 24,7 | 1,0 / 3,3 / 3,5 / 4,8 | 0,8 / 1,1 / 1,2 / 1,2 | 7,6 / 15,5 / 22,5 / 27,6 | 12,8 / 15,6 / 22,7 / 27,8 | 7,9 / 15,6 / 22,6 / 27,7 | 0 / 0 / 0 / 0 |
| D3 | 25,15 / 81,6 / 248,3 / 286,6 | 22,7 / 79,6 / 246,3 / 280,3 | 9,1 / 61,3 / 214,8 / 254,8 | 1,5 / 2,6 / 3,1 / 4,5 | 26,4 / 82,9 / 249,5 / 287,7 | 26,65 / 83,2 / 249,7 / 288,0 | 26,6 / 83,1 / 254,9 / 295,0 | 0 / 83 / 249 / 288 |
| D4 | 76,6 / 415,2 / 416,5 / 852,7 | 73,85 / 411,3 / 411,8 / 850,1 | 43,75 / 330,0 / 333,9 / 742,6 | 1,95 / 2,9 / 3,3 / 3,6 | 78,05 / 416,9 / 418,0 / 854,0 | 78,25 / 417,2 / 418,1 / 854,1 | 78,2 / 424,2 / 433,7 / 860,5 | 77,5 / 417 / 418 / 854 |
| D5 | 113,85 / 326,7 / 591,1 / 887,8 | 92,9 / 321,4 / 584,4 / 845,6 | 62,55 / 243,7 / 434,5 / 752,9 | 3,3 / 12,2 / 18,3 / 21,0 | 115,5 / 328,3 / 592,8 / 889,3 | 115,75 / 328,5 / 592,9 / 889,4 | 124,05 / 335,9 / 599,5 / 895,8 | 115,5 / 328 / 592 / 889 |

Persistencia Daily:

| Dificultad | `JSON.stringify` máx. | escritura máx. | retención P50 / máx. | carga V2 P50 / máx. | restauración V2 P50 / máx. |
|---|---:|---:|---:|---:|---:|
| D1 | 0,1 | 0,2 | 0,5 / 1,6 | 0,45 / 0,9 | 0,5 / 1,7 |
| D2 | 0,1 | 0,2 | 0,55 / 0,9 | 0,6 / 1,0 | 0,7 / 1,2 |
| D3 | 0,1 | 0,1 | 1,05 / 5,8 | 1,05 / 4,2 | 1,25 / 4,3 |
| D4 | 0,1 | 0,1 | 1,7 / 4,0 | 1,8 / 4,1 | 2,1 / 3,9 |
| D5 | 0,1 | 0,2 | 3,1 / 21,1 | 3,3 / 22,0 | 3,45 / 25,8 |

### Infinite

| Dificultad | H | G | S | Snap | Commit | Frame | Evt | LT |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 | 3,8 / 10,0 / 11,4 / 12,2 | 3,05 / 9,3 / 10,6 / 11,6 | 0,65 / 2,0 / 2,6 / 2,8 | 0,6 / 0,8 / 1,0 / 1,1 | 5,25 / 11,0 / 12,5 / 13,1 | 12,45 / 13,6 / 14,1 / 15,9 | 5,4 / 11,1 / 12,7 / 13,4 | 0 / 0 / 0 / 0 |
| D2 | 6,55 / 21,6 / 27,2 / 29,9 | 5,6 / 20,7 / 26,2 / 29,0 | 1,65 / 3,9 / 4,4 / 8,0 | 0,8 / 1,0 / 1,0 / 1,2 | 7,55 / 22,6 / 28,1 / 30,9 | 12,55 / 29,4 / 43,8 / 46,6 | 7,8 / 22,7 / 28,5 / 30,9 | 0 / 0 / 0 / 0 |
| D3 | 19,05 / 73,5 / 92,7 / 180,6 | 17,75 / 71,3 / 91,5 / 178,8 | 8,8 / 58,3 / 64,4 / 135,8 | 1,2 / 1,7 / 1,7 / 2,1 | 20,2 / 74,7 / 93,9 / 182,2 | 23,0 / 74,9 / 94,3 / 182,3 | 20,3 / 74,8 / 94,1 / 189,5 | 0 / 74 / 94 / 182 |
| D4 | 98,65 / 211,4 / 444,3 / 845,4 | 96,35 / 209,3 / 440,8 / 842,4 | 63,6 / 171,8 / 387,4 / 803,1 | 1,95 / 2,9 / 3,3 / 5,7 | 100,1 / 212,6 / 445,7 / 847,1 | 100,3 / 212,9 / 445,9 / 847,3 | 103,25 / 222,3 / 454,7 / 854,3 | 100 / 213 / 445 / 847 |
| D5 | 65,45 / 279,2 / 660,3 / 867,1 | 60,75 / 276,6 / 657,8 / 862,7 | 30,65 / 125,6 / 615,7 / 781,2 | 3,2 / 5,3 / 5,5 / 5,7 | 66,95 / 280,8 / 661,8 / 868,7 | 67,35 / 281,1 / 662,1 / 868,8 | 67,25 / 290,6 / 670,4 / 876,3 | 67 / 281 / 662 / 868 |

Persistencia Infinite:

| Dificultad | seed máx. | stringify máx. | escritura máx. | carga V2 P50 / máx. | restauración V2 P50 / máx. |
|---|---:|---:|---:|---:|---:|
| D1 | 0,1 | 0,1 | 0,1 | 0,4 / 0,6 | 0,5 / 1,0 |
| D2 | 0,1 | 0,1 | 0,1 | 0,6 / 1,0 | 0,7 / 1,4 |
| D3 | 0,1 | 0,1 | 0,2 | 1,1 / 3,0 | 1,3 / 3,1 |
| D4 | 0,1 | 0,1 | 0,1 | 1,8 / 4,8 | 2,0 / 5,4 |
| D5 | 0,1 | ≤0,1 | 0,2 | 3,1 / 5,6 | 3,1 / 5,6 |

`setSession`, lectura de sesión existente y planificación del estado fueron iguales o inferiores a 0,1 ms. La persistencia representa una fracción mínima; la generación y, dentro de ella, el solver dominan la CPU y el tiempo de pared. Mientras el handler está activo, CPU, pared y bloqueo de main thread son prácticamente el mismo intervalo. Commit/frame añaden normalmente uno o pocos milisegundos, salvo alineación con el frame.

### V1 y arranque

Una migración segura por dificultad produjo estos tiempos totales:

| Modo | D1 | D2 | D3 | D4 | D5 |
|---|---:|---:|---:|---:|---:|
| Daily V1 | 2,6 | 3,5 | 20,2 | 31,7 | 29,7 |
| Infinite V1 | 2,2 | 16,8 | 11,3 | 32,7 | 266,1 |
| arranque global con Infinite V1 | 2,4 | 16,3 | 11,3 | 32,5 | 266,3 |

Son fixtures únicos y relativamente favorables, no percentiles. El riesgo de cola debe tomarse de las veinte generaciones por grupo. La última fila confirma de forma directa que Infinite legacy regenera antes de `createRoot().render()`.

### Tamaño y clonación estructurada

Los tamaños son una aproximación reproducible mediante serialización compacta; no equivalen al tamaño exacto del grafo en heap. Se muestran mediana y máximo en bytes.

| Modo | D | caso generado | snapshot | envelope almacenado |
|---|---:|---:|---:|---:|
| Daily | D1 | 7.591 / 8.114 | 7.364 / 7.890 | 7.393 / 7.919 |
| Daily | D2 | 8.919 / 9.679 | 8.673 / 9.436 | 8.702 / 9.465 |
| Daily | D3 | 11.079 / 11.599 | 10.815 / 11.335 | 10.844 / 11.364 |
| Daily | D4 | 13.329 / 14.165 | 13.045 / 13.884 | 13.074 / 13.913 |
| Daily | D5 | 17.210 / 18.098 | 16.907 / 17.798 | 16.936 / 17.827 |
| Infinite | D1 | 7.401 / 7.885 | 7.172 / 7.656 | 7.219 / 7.703 |
| Infinite | D2 | 8.967 / 9.663 | 8.719 / 9.418 | 8.766 / 9.465 |
| Infinite | D3 | 10.891 / 11.731 | 10.626 / 11.467 | 10.673 / 11.514 |
| Infinite | D4 | 13.294 / 14.194 | 13.009 / 13.911 | 13.056 / 13.958 |
| Infinite | D5 | 16.776 / 17.838 | 16.472 / 17.536 | 16.519 / 17.583 |

Los 200 resultados, incluidos narrativa, tablero, personajes y pistas, pasaron `structuredClone`; no se encontró ningún valor no clonable. Los assets importados son strings URL, no bitmaps transferidos. El coste de clonación del generado fue P50 0,1–0,2 ms y máximo 1,0 ms; el del snapshot, P50 0,1 ms y máximo 0,6 ms. Duplicar temporalmente menos de 18 KiB de estructura serializada no es material frente al tiempo de generación, aunque el heap del módulo Worker y sus imports no se midió.

El snapshot reduce URLs repetidas a IDs estables, ya es el contrato persistente y evita que main repita su construcción. Por ello es preferible devolver **un snapshot validado**, no el caso generado y el snapshot a la vez. Main debe restaurarlo/validarlo antes de persistir y renderizar.

## Comportamiento visual y React actual

Las pantallas no tienen estado `loading` ni una solicitud en vuelo. La prueba directa mostró el botón antes del clic, ningún `role="status"`, y entrada en `GameScreen` después del trabajo (Daily D1: 7,3 ms; Infinite D1: 9,4 ms en esa prueba). El status encontrado después pertenece al feedback del juego, no a la generación.

- React agrupa el update del handler. Incluso añadir `setLoading(true)` inmediatamente antes de generar no permitiría pintar: hay que devolver o ceder al event loop primero.
- `startTransition` cambia prioridades de render, pero no mueve ni interrumpe el trabajo CPU del generador/solver; no resuelve el bloqueo.
- Alrededor de 100 ms el clic ya se percibe pesado; 300 ms es una pausa clara; 800 ms parece una interfaz congelada; por encima de un segundo aumenta el riesgo de que el jugador interprete fallo. Son umbrales perceptivos de producto, no límites normativos medidos aquí.
- El estado visual presionado del botón no tiene garantizado un frame de pintura propio. La UI anterior permanece sin feedback React hasta que termina el task.
- Durante el bloqueo no se procesan clics, navegación, timers, `visibilitychange` ni mensajes. Un doble clic físico queda en cola, no ejecuta dos handlers concurrentes.
- Al volver el control, el botón desaparece con el cambio a `GameScreen`. Según la entrega de input del navegador, un segundo evento encolado puede descartarse o dirigirse al nuevo árbol; el guard de sesión impediría una segunda generación si el handler original llegara a ejecutarse de nuevo.
- Un flujo futuro asíncrono sí abre concurrencia lógica. Necesita deshabilitar controles inmediatamente, admitir una única solicitud global y comprobar un token antes de persistir o hacer `setSession`.

## Errores y consistencia

| Caso | Estado visible actual | Persistencia/resultado | Reintento e implicación asíncrona |
|---|---|---|---|
| Error controlado del generador o límite de intentos | Daily muestra alerta genérica de “guardar”; Infinite queda en selección sin explicación | No escribe sesión nueva ni caso parcial | El botón permite otro intento; futuro: error tipado, no fallback automático |
| Excepción inesperada dentro de `start*` | Igual que el caso anterior | El `try` evita escritura parcial | Error recuperable visible y logging no sensible |
| `crypto.getRandomValues` en Infinite | Excepción del handler/console; ninguna explicación al jugador | No se escribe ni cambia estado | Está fuera del `try`; futuro: capturar antes de enviar al Worker |
| Fallo al crear o serializar snapshot | Daily alerta genérica; Infinite silencioso | No se confirma sesión; `replaceStorageValue` no se alcanza o intenta restaurar el valor previo | Mantener selección y seed de la solicitud para reintento |
| Cuota o fallo de `localStorage` | Daily alerta genérica; Infinite silencioso | Escritura verificada; restauración previa best-effort; no mostrar caso no persistido | Futuro: distinguir almacenamiento y no entrar a juego |
| Fallo de journal/adapter al arrancar | Arranca sin mensaje específico | `initializePersistence` omite migración/limpieza y React continúa | Debe exponerse en shell de recuperación; persistencia de sesión no usa journal |
| Fallo de retención Daily tras guardar | Se agenda `GameScreen` y además aparece alerta | La nueva sesión ya está persistida; puede quedar retención antigua | No regenerar; reintentar solo limpieza |
| Navegar, cerrar o mandar a background durante generación | No se procesa navegación JS mientras dure el task | Si se mata antes de la escritura, no hay sesión; después de escribir, V2 restaura | Actual no puede cancelar; futuro: terminar Worker/invalidar token |
| Pausa/reanudación de Android WebView | El WebView queda bloqueado hasta retorno si el proceso vive | Si el SO mata el proceso, aplican los dos estados anteriores | Debe probarse en dispositivo; lifecycle no puede interrumpir JS síncrono |
| Cambio de fecha Daily | El handler usa la fecha capturada; el timer/focus se procesa después | Puede guardar el caso del día anterior de forma coherente con esa clave | Futuro: congelar `dateKey`, invalidar al rollover antes de persistir |
| Dos solicitudes consecutivas | No son concurrentes; la sesión existente hace corto circuito | No genera dos casos; Infinite puede gastar otro seed antes del guard | Futuro: botón deshabilitado y un solo request activo |
| Resultado tardío o pantalla desmontada | No existe hoy porque la llamada es síncrona | No hay resultado asíncrono obsoleto | Futuro: `requestId`, token de montaje y terminación al cancelar/unmount |
| Sesión existente | Se restaura/devuelve, no regenera | Conserva V2 existente | Correcto; verificar antes de crear seed/trabajo futuro |
| Legacy V1 | Puede bloquear arranque o inicializador | Éxito reemplaza por V2; fallo elimina legacy reconocido | Futuro: migración visible; no aceptar respuesta tras abandono |
| V2 corrupto Daily | Se elimina y vuelve a selección | No hay runtime parcial | Permite crear nuevo caso |
| V2 corrupto Infinite | Devuelve `null`, pero conserva el valor corrupto hasta sobrescritura | La siguiente creación correcta lo reemplaza | Inconsistencia actual a documentar/cubrir; no es motivo para cambiar formato |

El orden de creación es favorable a la integridad: se genera y se persiste antes de `setSession`. No se muestra un caso recién generado que todavía no haya quedado guardado. Esa propiedad debe conservarse.

## Viabilidad de un Web Worker

El recorrido estático desde `generateDailyCase`, `generateInfiniteCase` y `createProceduralCaseSnapshot` encontró 54 módulos TypeScript, 94 imports de assets y ningún import sin resolver ni paquete externo. Incluye generación, escenarios, personajes, evaluadores, solver y snapshot.

- En ese grafo ejecutado no aparecen dependencias de DOM, `window`, `document`, `localStorage`, `navigator` ni `self`. `daily/rollover.ts` usa APIs de ventana, pero no forma parte del grafo.
- La observabilidad usa `performance` con fallback a `Date.now`, ambos disponibles en Worker. Los callbacks de observación no son clonables y no deben cruzar el protocolo; el Worker puede devolver métricas básicas cuando se soliciten.
- El RNG es propio y seeded. No hay `crypto` en la generación; `createInfiniteSeed` debe permanecer en main.
- Hay caches de módulo en los generadores Daily e Infinite. Las rutas directas `generate*` auditadas no los mutan. El Worker debe usar esas rutas directas y no APIs cacheadas; su ámbito de módulo sería además independiente.
- Los 200 objetos son clonables. Los assets son URLs string; el snapshot los convierte en IDs conocidos.
- Vite admite el patrón de Worker módulo con URL emitida. La PWA actual precachea los chunks JS y Capacitor copia `dist`; no obstante, como aún no existe el chunk, su inclusión, URL bajo la base de GitHub Pages, disponibilidad offline y soporte del WebView objetivo son requisitos de verificación futura, no hechos demostrados por esta auditoría.
- RNG, offsets y fingerprints pueden conservarse exactamente si el Worker llama a las mismas funciones puras con los mismos inputs. El cambio de hilo por sí solo no cambia el orden de operaciones.

La separación recomendada es:

```text
MAIN                                      WORKER
fecha/seed + dificultad
estado pending + requestId  ----------->  generar caso directamente
                                           ejecutar solver/evaluadores
                                           crear/validar snapshot
                         <-------------  snapshot o error tipado + métricas
restaurar/validar snapshot
crear exactamente el envelope V2 actual
JSON.stringify + localStorage verificado
setSession + render GameScreen
```

Protocolo mínimo versionado:

```ts
type GenerateRequest = {
  protocolVersion: 1;
  requestId: string;
  mode: 'daily' | 'infinite';
  difficulty: Difficulty;
  dateKey?: string;
  seed?: string;
  includeMetrics?: boolean;
};

type GenerateResponse =
  | { protocolVersion: 1; requestId: string; ok: true; snapshot: ProceduralCaseSnapshot; metrics?: WorkerMetrics }
  | { protocolVersion: 1; requestId: string; ok: false; error: { code: string; message: string; retryable: boolean } };
```

Debe existir discriminación estricta Daily/Infinite para impedir combinaciones inválidas de `dateKey` y `seed`. Los errores han de ser datos clonables, no objetos `Error` asumidos como portables. Las métricas no deben contener narrativa, secretos ni callbacks.

### Arranque, memoria y persistencia del Worker

No puede medirse el arranque inicial sin implementar el Worker. El coste incluirá crear el contexto, cargar/evaluar su chunk y calentar JIT; debe medirse frío y caliente en la tarea posterior. Crear un Worker por solicitud repetiría ese coste y perdería caches/JIT. Se recomienda una única instancia perezosa y persistente, reutilizada mientras la aplicación vive, con una sola solicitud activa.

La transferencia medida es despreciable frente a las colas del solver. Construir el snapshot en el Worker mueve también 0,6–21 ms observados fuera de main; main conserva una restauración/validación de aproximadamente 0,5–3,45 ms medianos, con máximo aislado de 25,8 ms en Daily D5. No conviene usar JSON como protocolo: structured clone ya acepta el contrato, evita stringify/parse adicional y costó como máximo 0,6 ms para snapshots. JSON permanece únicamente donde lo exige el formato actual de `localStorage`.

## Comparación de alternativas

| Opción | Bloqueo / total | Complejidad y determinismo | Persistencia, plataformas y cancelación | Veredicto |
|---|---|---|---|---|
| A. Síncrona actual | No reduce bloqueo; total mínimo | Mínima; riesgo determinista nulo | Persistencia ya probada; PWA/Android se congelan; no cancelable | Rechazada por colas D4/D5 |
| B. Loading y siguiente task | Pinta feedback, luego congela casi el mismo tiempo | Baja; no toca generador | Compatible y rollback fácil; navegación/cancelación siguen bloqueadas | Mitigación insuficiente |
| C. Cooperativa por fragmentos | Puede repartir CPU, aumenta pared por yields | Alta: exige convertir bucles/solver a máquina reanudable; riesgo de alterar orden RNG, límites y fingerprints | Main conserva persistencia; cancelable entre yields; tests complejos | Rechazada por invasividad y riesgo |
| D. Worker módulo puro | Elimina casi toda la CPU de main; suma arranque/transferencia pequeños | Media; determinismo preservable con inputs idénticos | Buena PWA/Android si chunk está empaquetado; cancelable terminando Worker; sin ruta degradada | Viable, pero falta resiliencia |
| E. Idle/precarga | Puede ocultar total si acierta; consume CPU anticipada | Alta por invalidación/caches | Daily antes de elegir exige generar cinco casos o adivinar; tras cambio desperdicia; Infinite aún no tiene seed; batería/rollover problemáticos | Rechazada |
| F. Worker + fallback tras feedback | Worker quita bloqueo; fallback conserva el bloqueo pero muestra estado primero | Media; mismas funciones y snapshot | Persistencia siempre main; offline/build verificables; terminación y tokens; rollback por feature switch | **Seleccionada** |

En E, reservar un seed Infinite antes del clic cambiaría semántica y potencialmente persistencia. Generar todos los Daily por adelantado penalizaría batería y dispositivos lentos, y multiplicaría trabajo que casi siempre se descarta. No se recomienda como complemento inicial.

## Diseño UX para la arquitectura seleccionada

Al hacer clic, main fija dificultad y `dateKey`/seed, registra `requestId` y deshabilita inmediatamente botón y selectores. Debe exponer `aria-busy="true"` en la región y un estado visible con `role="status"` y `aria-live="polite"`:

- Daily: “Preparando el caso diario…”
- Infinite: “Generando un expediente…”

El indicador será indeterminado; el generador no ofrece fases estables con las que prometer un porcentaje. Para evitar parpadeo, el elemento visual grande puede revelarse tras unos 100 ms, pero el control deshabilitado y el anuncio accesible deben ser inmediatos. No debe imponerse un retraso mínimo a la navegación cuando el resultado ya está persistido. Con movimiento reducido se usa un indicador estático, no una animación continua.

“Cancelar” y volver atrás terminan el Worker porque un mensaje de cancelación no puede interrumpir el solver síncrono dentro de ese mismo Worker. Además incrementan/inutilizan el token; cualquier mensaje tardío se ignora antes de validar o escribir. La selección de dificultad se conserva. Solo puede existir una solicitud activa.

Los errores se presentan con `role="alert"` y acciones concretas:

- generación: “No se pudo generar el caso. Inténtalo de nuevo”;
- almacenamiento: “El caso se generó, pero no pudo guardarse. Libera espacio e inténtalo de nuevo”;
- infraestructura Worker: usar el fallback solo si falla soporte, construcción, carga o handshake; no ocultar con fallback un error de dominio del generador.

Daily reintenta con la misma fecha/dificultad si sigue vigente. Infinite conserva el mismo seed para “Reintentar”; una acción distinta “Generar otro caso” crea otro seed. Al rollover Daily se termina/invalida la petición antigua, se mantiene la dificultad y se informa de que comenzó un nuevo día.

El fallback pinta primero el mismo estado y cede al menos un frame/task antes de invocar la ruta síncrona intacta. Durante esa ruta vuelve a congelarse y no puede ofrecer cancelación efectiva; la UI debe evitar prometerla en modo degradado.

La migración legacy no debe seguir siendo trabajo invisible anterior a React. La implementación futura debe recuperar primero el journal, renderizar un shell y mostrar “Actualizando partida guardada…” mientras el Worker regenera. Éxito persiste el mismo V2 en main; error ofrece reintentar o descartar explícitamente. Este cambio de orquestación no autoriza modificar V1/V2, RNG ni snapshots.

## Plan de pruebas futuro

### Automatizable con Vitest

- Tipos/validadores del protocolo, versión desconocida y combinaciones inválidas de modo/input.
- Handler puro del Worker frente al generador directo para datasets fijos D1–D5.
- Igualdad estructural canónica y, donde el contrato lo permita, bytes JSON exactos del snapshot/envelope.
- Fingerprints, RNG, seeds, offsets, límites y conteos de llamadas existentes sin cambios.
- Serialización de errores y ausencia de funciones/`Error` opacos en mensajes.
- Controlador main con puerto Worker falso: doble clic, una sola petición, request ID incorrecto, cancelación, unmount, rollover Daily y resultado tardío.
- Fallo de snapshot/restauración/almacenamiento después de generar: no `setSession`, no sesión parcial y seed conservado.
- Sesión existente, reapertura V2 sin generar, migración V1 y V2 corrupto.
- Fallback sin `Worker`, fallo de constructor, fallo de handshake y prohibición de fallback ante error de dominio.

### Navegador real/build

- Worker módulo real servido por Vite en desarrollo y producción; primera solicitud fría y sucesivas calientes.
- Comparación directa/Worker con al menos el corpus auditado y clones reales.
- Commit, primer frame, long tasks, respuesta a eventos, cancelación por `terminate()` y navegación.
- Accesibilidad: foco, anuncio único, `aria-busy`, controles deshabilitados, alertas, teclado y `prefers-reduced-motion`.
- PWA instalada y offline después de la primera instalación; comprobar que el chunk Worker está en precache y que una actualización no mezcla versiones de protocolo.
- GitHub Pages bajo su base real: URL del chunk Worker y recarga/offline.

### Android WebView/dispositivo

- Build/sync de Capacitor y APK debug offline; confirmar que el chunk se copia y se crea como Worker módulo.
- Dispositivos/emuladores representativos lentos y recientes: D1–D5, frío/caliente, memoria y batería.
- Background/foreground, pausa/reanudación, back de Android, rotación si aplica y proceso destruido antes/después de persistir.
- Reapertura V2, migración V1 visible, fallo/cuota de almacenamiento y actualización de app con petición abandonada.

Los criterios de aceptación deben exigir fingerprints y snapshots idénticos, cero long tasks atribuibles a generación en la ruta Worker, ninguna persistencia desde el Worker, y ninguna respuesta obsoleta capaz de escribir o navegar.

## Riesgos

1. El chunk Worker puede no quedar precacheado o resolver mal la base de Pages; debe ser una condición de build, no una suposición.
2. Android WebView objetivo puede diferir del Chromium de escritorio en soporte, startup, memoria y terminación del proceso.
3. Un Worker no hace cancelable internamente al solver: cancelar requiere terminar y recrear la instancia, perdiendo calentamiento.
4. Una respuesta correcta puede volverse obsoleta por navegación, unmount o rollover; validar `requestId` y contexto antes de persistir es obligatorio.
5. Persistir en el Worker rompería la propiedad y consistencia actuales de almacenamiento; queda prohibido en la arquitectura elegida.
6. La migración V1 visible requiere cambiar el orden de bootstrap, con pruebas específicas para recuperación de journal y Strict Mode.
7. Las cifras proceden de hardware de escritorio potente y 20 muestras; el riesgo móvil real es probablemente mayor y el `p99` aún no es estadísticamente robusto.
8. El Worker añade un heap y coste frío no medidos. Deben fijarse presupuestos después de medir la implementación, no antes.

## Decisión final

Se selecciona **únicamente la opción F: un Worker módulo Vite, perezoso y persistente, con fallback síncrono después de pintar loading**.

- Fuera de main: `generateDailyCase`/`generateInfiniteCase`, solver/evaluadores y `createProceduralCaseSnapshot`, usando rutas directas sin caches y los mismos inputs.
- En main: fecha, `crypto`/seed, autorización de una petición, UX, restauración y validación del snapshot, envelope V2 exacto, JSON, `localStorage`, retención, `setSession` y render.
- Cancelación/invalidez: una sola solicitud; `requestId` versionado y token de pantalla/contexto; `terminate()` al cancelar, volver, desmontar o vencer la fecha; ignorar toda respuesta que no coincida antes de escribir.
- Fallback: solo ante ausencia/fallo de infraestructura Worker; pintar/ceder primero y ejecutar la API síncrona existente. Un error del generador se muestra y no dispara doble generación.
- Compatibilidad: snapshot y formatos V1/V2 no cambian. La persistencia verificada sigue en main y precede al render del juego.
- Verificación obligatoria: igualdad directa/Worker, PWA offline y precache, base de Pages, Capacitor/APK offline y WebView real.
- Fuera de alcance: optimizar solver/generador, cambiar RNG/seeds/offsets/fingerprints/límites, modificar snapshots, precalcular en idle, porcentajes de progreso, persistir desde Worker o implementar ahora esta propuesta.

La recomendación no busca acortar necesariamente la CPU total; busca retirar de main los 60–850 ms de generación observados en las colas D4/D5, mantener la integridad de guardado y hacer que feedback, navegación y accesibilidad sigan respondiendo.

## Validación y limpieza

Validación final, ejecutada después de retirar la instrumentación:

| Comprobación | Resultado |
|---|---|
| Referencia Git | `pre`, commit `5759a7121626f2733ca3b3054a8fa3d13194077b`, `origin/pre...pre = 0/0`; árbol inicialmente limpio |
| TypeScript | `npx tsc -b --pretty false`: correcto |
| Oxlint | `npm run lint`: correcto |
| Suite completa | 97 archivos, 689 tests correctos, 6,56 s |
| Auditoría procedural | 200/200 correctas, 133 fallbacks, 0 fallos; 3.163 llamadas de solver; 18.667 ms |
| Calidad | 250/250 puzzles; D1 309 ms, D2 485 ms, D3 2.303 ms, D4 6.938 ms, D5 14.563 ms; 0 fallos |
| Perfil D5 | 20/20, media 306 ms, máximo 918 ms; 27,1 llamadas solver de media, máximo 87 |
| Normal | 21 casos publicados correctos |
| Fingerprints, RNG y snapshots | 4 archivos dirigidos, 11 tests correctos |
| Build web | Correcta; 460 módulos; PWA generada con 225 entradas precacheadas |
| PWA | `verify:pwa`: correcto |
| GitHub Pages | `verify:pages`: PWA y base Pages correctas |
| Capacitor/Android | `verify:android`: sync y verificador correctos |
| APK debug offline | `BUILD SUCCESSFUL` en 11 s; 93 tareas (24 ejecutadas, 69 actualizadas); 120.183.232 bytes; Gradle `--offline` |
| Higiene | `git diff --check`: sin errores; no hay ficheros de arnés, logs ni perfiles temporales |

Los runners Vite no pudieron crear subprocesos dentro del sandbox (`spawn EPERM`); las mismas órdenes se repitieron con autorización fuera de esa restricción y pasaron. Gradle se ejecutó expresamente con `--offline`; no se usó la red. Los avisos conocidos de tamaño del chunk web, `flatDir`, versión XML del SDK y deprecaciones Gradle no bloquearon las verificaciones.

La instrumentación temporal consistió en un entrypoint de auditoría, arneses CDP/UI y un explorador del grafo de imports. No forma parte de esta propuesta ni debe quedar en el árbol final. Los perfiles de navegador se crearon en el directorio temporal del sistema y se eliminaron. El único cambio permanente esperado es este documento.
