# Daily e Infinite: tiempo, identidad y persistencia

Este documento define el contrato vigente de los modos procedurales. Daily e Infinite no son casos Normal, no usan el loader JSON manual y no deben añadirse a `manualNormalCases`.

## Fecha e identidad de Daily

`getDailyDateKey()` es la única fuente de la fecha Daily. Lee `getFullYear()`, `getMonth()` y `getDate()` del dispositivo y produce `YYYY-MM-DD`; no usa locale, `toISOString()` ni una conversión UTC para decidir el día.

La identidad es:

```text
daily-{fecha local}-d{dificultad}-g{versión del generador}
```

La seed base se deriva solo de la fecha civil local y la dificultad. No intervienen usuario, cuenta, zona de servidor ni ningún identificador del dispositivo. Dos jugadores con la misma fecha local y dificultad obtienen el mismo caso. Dispositivos en fechas locales distintas pueden obtener casos distintos en el mismo instante.

`useDailyDate()` observa la próxima medianoche local y comprueba de nuevo la fecha en `focus` y `visibilitychange`. El temporizador se recalcula después de cada comprobación y todos los recursos se limpian al desmontar.

- Antes de iniciar, un cambio de fecha actualiza la oferta.
- Una partida iniciada conserva el `dateKey`, seed y snapshot originales aunque llegue medianoche.
- No hay navegación automática ni sustitución del tablero activo.
- Al abandonar la ruta y volver, solo se ofrece/restaura la sesión de la fecha local actual.

Esta lógica es web pura compartida por navegador, PWA y la WebView de Capacitor/Android.

## Formato persistido

Las claves siguen siendo `mystery-cases-daily-session` y `mystery-cases-infinite-session`. El envelope de sesión es V2:

```ts
// Daily
{ saveVersion: 2, snapshot: ProceduralCaseSnapshot }

// Infinite
{ saveVersion: 2, status: 'active' | 'completed', snapshot: ProceduralCaseSnapshot }
```

`ProceduralCaseSnapshot` V1 contiene:

- `formatVersion` y `generatorVersion`;
- `mode`, `originalSeed`, `effectiveSeed`, `seedOffset` y dificultad;
- `dailyDateKey` solo para Daily;
- `scenarioPackId`, culpable, intentos y estadísticas de generación;
- todos los datos de juego del `GameCase`: ID, textos, dimensiones, zonas, tablero, objetos, personajes, pistas, evidencia global, solución, traits y edge features.

El snapshot es JSON puro. Las URLs producidas por el bundler no se guardan: zonas, objetos y avatares se representan mediante IDs estables y se hidratan desde los catálogos locales. Esos IDs y el contenido visual al que apuntan forman parte del contrato de compatibilidad: no deben eliminarse, reasignarse ni sobrescribirse para sesiones soportadas; un asset nuevo debe recibir un ID/ruta nuevos.

El progreso mutable del tablero no se duplica dentro del snapshot. Sigue en `CaseSave V4`, bajo el ID versionado del `GameCase`, e incluye placements, exclusiones, ayudas, checkpoints y comprobaciones de posición. El estado de Infinite permanece en el envelope. Por tanto, una partida persistida se compone de snapshot inmutable + `CaseSave V4` mutable.

Antes de persistir y después de hidratar se reutilizan `validateCaseDefinition()`, la validación de calidad procedural, el solver, la coincidencia con la solución canónica y la comprobación del culpable. Un formato, asset, ID, seed, fecha, metadata o caso incoherente se ignora sin exponer una excepción a la UI.

Los envelopes medidos con la muestra fija D1–D5 ocupan aproximadamente:

| Dificultad | Daily | Infinite |
| --- | ---: | ---: |
| D1 | 7.533 bytes | 7.618 bytes |
| D2 | 8.412 bytes | 8.907 bytes |
| D3 | 10.420 bytes | 11.828 bytes |
| D4 | 12.724 bytes | 13.058 bytes |
| D5 | 16.459 bytes | 17.095 bytes |

El peor caso de la muestra es aproximadamente 17 KiB, razonable frente a la cuota habitual de `localStorage`. Los errores de escritura se tratan de forma conservadora: la sesión no se inicia como persistida si el snapshot no puede guardarse.

## Restauración y legacy

Una sesión V2 válida se hidrata desde el snapshot. El generador no se invoca, aunque la versión de generación actual sea distinta.

Las sesiones legacy se reconocen de forma explícita:

- Daily V1: `{ saveVersion: 1, dateKey, difficulty }`.
- Infinite V1: `{ saveVersion: 1, generationVersion: 1, difficulty, seed, status }`.

Si la sesión legacy corresponde al Daily actual o contiene una seed Infinite válida, se reconstruye una sola vez con el generador actual, se valida y se sustituye inmediatamente por V2. El segundo load usa el snapshot. Si no se puede reconstruir o persistir de forma segura, la metadata legacy se elimina para no regenerar repetidamente ni presentar otro caso como el original. JSON corrupto o formatos desconocidos se ignoran sin crash.

La migración legacy es necesariamente una mejor aproximación: el formato antiguo no guardaba el caso ni una versión histórica utilizable. Solo las sesiones V2 garantizan restauración exacta entre cambios de algoritmo.

## Política de versiones

Incrementar `PROCEDURAL_GENERATION_VERSION` cuando la misma entrada pueda producir un `GameCase` distinto: algoritmo, orden de catálogos, roster, escenarios, pistas, solver, dificultad, reintentos o selección de contenido. Actualizar los fingerprints solo tras revisar el cambio intencional. El bump aísla IDs y saves nuevos; no invalida snapshots V2 existentes.

Incrementar `PROCEDURAL_SNAPSHOT_FORMAT_VERSION` cuando cambie de forma incompatible la representación persistida o su hidratación. Mantener un decoder/migrador para versiones todavía soportadas antes de escribir el nuevo formato. Un cambio meramente interno o aditivo que el decoder V1 ya tolere no requiere bump.

`saveVersion` pertenece al envelope Daily/Infinite; `formatVersion`, al snapshot; `generatorVersion`, al contenido generado. No son intercambiables.

## Cómo verificar cambios

Ejecutar como mínimo:

```text
npx vitest run src/game/__tests__/dailyDate.test.ts src/game/__tests__/dailyRollover.test.ts
npx vitest run src/game/__tests__/dailySession.test.ts src/game/__tests__/infinite.test.ts src/game/__tests__/proceduralSnapshot.test.ts
npx vitest run src/game/__tests__/proceduralFingerprint.test.ts
npx tsc -b
npm run lint
```

`proceduralFingerprint.test.ts` congela diez resultados `g7` capturados antes del endurecimiento: D1–D5 para Daily e Infinite. Las pruebas de sesión inyectan un generador que falla para demostrar que una restauración V2 no lo llama; las de migración demuestran que V1 solo se reconstruye una vez.
