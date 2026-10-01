# Auditoría final de preparación de release de MysteryCases

Periodo de ejecución: 2026-09-29–2026-10-01  
Rama: `pre`  
HEAD: `47a45d12453f163dd67327e2935852552282649b`  
Upstream: `origin/pre`, divergencia inicial y final `0/0`  
Base comparada: `origin/main` / `b48cfec091461a096d75929dc3e75c17e87f30a8`  
Versión declarada durante la auditoría original: `1.1.0`

## Resolución de los bloqueadores (2026-10-01)

Los dos bloqueadores de código detectados por esta auditoría quedan resueltos en el working tree de `pre`, partiendo de `eff60dc8c470f00cafb4b084185e4be670624999`:

1. La candidata nueva tiene identidad `1.2.0` en `package.json` y en la raíz de `package-lock.json`; Android declara `versionName "1.2.0"` y `versionCode 3`. El tag y toda la evidencia de `v1.1.0` permanecen históricos y no se han movido ni reescrito.
2. El gate Android deriva la versión esperada de `package.json`, confirma la configuración Gradle, exige APK no vacío y firma válida, obtiene package/versión/código con herramientas Android instaladas y compara exactamente inventario y SHA-256 de `assets/public` contra los assets sincronizados. También exige un único chunk Worker actual. La ruta oficial `android:prepare:release` reconstruye y sincroniza primero los assets desde el código del HEAD mediante `android:sync`; solo tras ese éxito ejecuta el gate y puede crear una copia byte a byte idéntica. Así, una APK antigua de la misma versión tampoco puede pasar junto con assets sincronizados obsoletos.

La APK release local preexistente no se eliminó, sobrescribió ni copió. El nuevo gate la rechazó con código 1 y este diagnóstico exacto:

```text
Android release verification failed:
- APK versionName 1.1.0 does not match expected 1.2.0.
- APK versionCode 2 does not match expected 3.
- APK assets are missing 5 file(s): assets/case-schema-validator-DvA17woa.js, assets/index-InU8_iIM.css, assets/index-mitx4V5P.js, assets/proceduralGeneration.worker-DJv38HNH.js, assets/rolldown-runtime-B0Z9INg1.js.
- APK assets contain 3 unexpected file(s): assets/index-BrceNb_E.js, assets/index-Dz11eLkb.css, icons.svg.
- APK assets differ in 2 file(s): index.html, sw.js.
- Release APK must contain exactly one procedural Worker chunk; found 0.
```

La validación de la resolución completó TypeScript, Oxlint, 17 pruebas contractuales nuevas, la suite completa de 736 tests, coherencia offline de package/lockfile, build web, `verify:pwa`, `verify:pages` y `verify:android`. La APK debug se construyó con Gradle offline y declaró `com.mysterycases.app`, `versionName 1.2.0` y `versionCode 3`; su SHA-256 fue `4E8CDF69F5BB5274C69BDFFB3BAFBE1ED89FC9EC40490A235114E0CEBD5AE7D1`. Contuvo `assets/public/assets/proceduralGeneration.worker-DJv38HNH.js`, cuyo SHA-256 empaquetado y sincronizado coincidió en `4DFED317830938027E1D61213D864E836A44A6671F8D9F2AA03DC8602B593336`.

El APK release antiguo y su copia ignorada conservaron sin cambios el SHA-256 histórico `2197BEFCE61870E1ED8CDAE5CBBBEF5B67128F6AA21DF09428A46AA914CCAE7E`. Se ejecutó `android:prepare:release` contra ese APK solo hasta demostrar el rechazo: primero completó el build y sync frescos, después mostró los mismos seis diagnósticos del bloque anterior bajo `Android release preparation failed:` y terminó con código 1 antes de copiar.

Esto cierra los dos defectos de preparación en código, pero **no autoriza todavía una publicación**: falta construir y validar una APK release firmada nueva de `1.2.0`, y las pruebas en PWA instalada y Android WebView real continúan pendientes. No se añadieron credenciales, no se construyó una release firmada y no se realizó commit, tag, push ni publicación.

## Veredicto original (2026-09-29)

**BLOQUEADO para crear o publicar una nueva release.**

El contenido funcional auditado está estable: TypeScript, Oxlint, 719 tests, la batería dirigida, los 21 casos Normal, 250 puzzles procedurales, fingerprints, builds Web/PWA/Pages/Android y la APK debug offline superaron sus validaciones. No se reprodujo un defecto jugable nuevo.

La promoción no es segura por dos bloqueadores de release:

1. `v1.1.0` y Android `versionCode 2` ya identifican la release presente en `main`; `pre` contiene 17 commits adicionales, pero conserva exactamente esos identificadores.
2. `verify:android:release` acepta un APK release antiguo que no contiene el Worker incorporado por `pre`. Un resultado verde del script no demuestra que el artefacto corresponda al HEAD auditado.

PWA instalada y Android WebView real continúan **no ejecutados** por falta de superficie. No se consideran superados mediante build.

## Estado inicial y alcance real

El working tree inicial era limpio. No se hizo `pull` ni se usó la red. Las referencias remotas ya disponibles localmente mostraban:

| Referencia | Commit |
|---|---|
| `pre`, `origin/pre` | `47a45d12453f163dd67327e2935852552282649b` |
| `main`, `origin/main` | `b48cfec091461a096d75929dc3e75c17e87f30a8` |
| tag anotado `v1.1.0` | apunta a `b48cfec091461a096d75929dc3e75c17e87f30a8` |

`pre` está 17 commits por delante de `main`: 178 archivos cambiados, 11.478 inserciones y 2.781 eliminaciones. El alcance incluye:

- serialización JSON y herramientas de authoring para C01–C15;
- endurecimiento de sesiones Daily/Infinite, snapshots, retención, reset y finalización transaccional;
- observabilidad procedural reproducible;
- optimizaciones A1–A4 y el experimento row-major adoptado del solver;
- generación Daily/Infinite en Worker con fallback de infraestructura;
- documentación y auditoría E2E del Worker.

El último commit solo añade `docs/procedural-worker-e2e-audit.md`; el código de runtime de este HEAD es el mismo que el auditado allí en `b9796c9`.

## Bloqueadores de release

### ALTO / BLOQUEADOR 1 — Identidad de release reutilizada

**Reproducción**

- `package.json`, la raíz de `package-lock.json` y el lockfile declaran `1.1.0`.
- Android declara `versionName "1.1.0"` y `versionCode 2`.
- `main` y el tag inmutable `v1.1.0` ya contienen esos mismos valores.
- `git describe` para `pre` produce `v1.1.0-17-g47a45d1`.

**Impacto**

- No se puede crear correctamente otro tag `v1.1.0` sin mover o reemplazar el existente.
- Una tienda Android exige un `versionCode` mayor para aceptar una actualización; reutilizar `2` no identifica un paquete posterior.
- Web, APK, documentación y GitHub Release podrían presentar dos contenidos distintos como `1.1.0`.

**Causa probable**

La rama siguió incorporando cambios después de cerrar y etiquetar `v1.1.0`, sin abrir todavía la siguiente identidad de release.

**Cambio mínimo recomendado**

Elegir una versión nueva, actualizar de forma conjunta `package.json`, `package-lock.json`, `versionName`, un `versionCode` estrictamente mayor que `2` y la documentación de release. No mover ni reutilizar `v1.1.0`.

### ALTO / BLOQUEADOR 2 — El verificador Android acepta un APK release obsoleto

**Reproducción**

1. `npm run verify:android:release` terminó con código 0 y `Android release verification passed.`
2. El APK que encontró era `android/app/build/outputs/apk/release/app-release.apk`, escrito el 2026-09-22, antes del Worker.
3. Su SHA-256 es `2197BEFCE61870E1ED8CDAE5CBBBEF5B67128F6AA21DF09428A46AA914CCAE7E` y no contiene ninguna entrada `proceduralGeneration.worker-*.js`.
4. La copia local ignorada `release/MysteryCases.apk` es byte a byte el mismo archivo obsoleto.
5. La APK debug actual sí contiene `assets/public/assets/proceduralGeneration.worker-DJv38HNH.js`.

**Impacto**

El flujo manual puede validar y publicar por error una APK de una revisión anterior. En este caso la APK aceptada carece de la arquitectura Worker de `pre`.

**Causa probable**

`scripts/verify-android-release.mjs` valida configuración, existencia, tamaño y firma, pero no vincula el APK a `dist`, a los assets sincronizados, al Worker esperado ni al commit actual.

**Cambio mínimo recomendado**

- retirar de forma controlada artefactos release previos antes de construir;
- generar una APK firmada desde el commit final y sin reutilizar el archivo antiguo;
- comparar dentro del verificador el inventario o hashes de los assets web críticos, incluido el Worker, contra `android/app/src/main/assets/public`;
- registrar versión, hash y commit de procedencia antes de copiar a `release/MysteryCases.apk`.

No se eliminó, reconstruyó, copió ni publicó ninguno de los artefactos release locales durante esta auditoría.

## Alcance funcional

### Normal

- `src/game/normal/availability.ts` publica exactamente 21 casos: D1/C01–C15 y D2/C01–C06.
- C01–C15 están en 15 JSON versionados con `schemaVersion: 1`; sus wrappers mantienen la API `GameCase`.
- Los seis D2 siguen siendo definiciones manuales registradas y probadas.
- `caseAssetRegistry` resuelve las claves de los JSON mediante imports del bundler y rechaza claves inexistentes.
- Rutas inválidas o bloqueadas redirigen antes de generar/cargar saves; navegación, desbloqueo, restauración y finalización están cubiertos por la batería dirigida.
- `verify:normal-cases` resolvió y validó los 21 casos, unicidad, solución canónica, víctima, culpable e IDs.
- D3–D5 tienen conteo publicado cero de forma deliberada. Su indisponibilidad **no es un defecto**.
- `case:draft`, `case:validate`, `case:validate-all`, esquema JSON y documentación de authoring forman un flujo local reproducible. La validación global confirmó 15 JSON y 15 registros JSON de runtime.

### Daily

- La clave civil se deriva de año/mes/día locales y el rollover invalida correctamente una generación pendiente.
- La creación usa Worker y persiste primero un envelope de sesión V2 que contiene snapshot procedural V1.
- V2 se restaura desde snapshot sin ejecutar el generador; V1 se reconstruye y migra una vez.
- Un Daily antiguo válido puede seguir activo; completar o abandonar usa transacción recuperable y poda el tablero/sesión correspondiente sin borrar progreso agregado.
- Corrupción, cuota simulada, storage no disponible, journal pendiente y recuperación están cubiertos por tests.
- La auditoría E2E anterior del mismo runtime comprobó Daily D1/D2 online y offline, rollover y persistencia previa a `GameScreen`. D5 se probó contra el Worker, no como flujo UI completo.

### Infinite

- La seed es `uint32` de `crypto.getRandomValues`; se reintenta hasta ocho veces para evitar la seed inmediatamente anterior.
- El generador prueba offsets deterministas y expone diagnósticos sin alterar RNG, seeds o fingerprints.
- Sesión V2, snapshot V1, migración legacy, estado `active/completed`, finalización, descarte y restauración están cubiertos.
- Una sola petición puede estar activa. Cancelar/desmontar termina el Worker y los tokens impiden que respuestas tardías escriban o naveguen.
- El fallback solo se activa ante errores de infraestructura; errores de dominio no degradan silenciosamente al hilo principal.
- La auditoría E2E anterior comprobó doble activación, cancelación y nueva generación, recarga/atrás durante generación y restauración sin Worker.

## Persistencia y actualización

### Catálogo de almacenamiento

| Familia | Contrato actual | Migración/retención comprobada |
|---|---|---|
| Saves de partida | `mystery-cases-${caseId}`, `CaseSave V4` | Lee V1–V4; normaliza corrupciones; IDs manuales y procedurales validados |
| Sesión Daily | `mystery-cases-daily-session`, envelope V2 | Lee V1; V2 restaura snapshot V1 sin regenerar |
| Sesión Infinite | `mystery-cases-infinite-session`, envelope V2 | Lee V1; conserva `active/completed`; V2 no regenera |
| Progreso | global V1 y Normal V2 | Normal lee V1 y conserva números históricos válidos |
| Estadísticas/historial/logros | claves V1 acotadas por validadores | Finalización transaccional e idempotencia probadas |
| Intentos | `mystery-cases-attempt-${caseId}` | Receipt secuencial para cierre atómico |
| Journal | `mystery-cases-storage-transaction` | before/after versionado y recuperación al arrancar |
| Preferencias | `mystery-cases-settings` | Se conserva durante reset completo |

El reset deriva las claves propias del catálogo, elimina progreso, sesiones, saves, receipts, journal, estadísticas, historial y logros, y conserva ajustes y claves ajenas. Los adaptadores tipan cuota, indisponibilidad y fallo; las escrituras de reemplazo restauran el valor anterior cuando es posible. `PersistenceBootstrap` recupera el journal antes de montar la aplicación.

La actualización funcional desde formatos admitidos queda cubierta por tests de `CaseSave` V1–V4, progreso legacy, sesiones V1, snapshots V2 y transacciones. Sin embargo, Android no puede distribuir esa actualización mientras se reutilice `versionCode 2`.

No se encontraron fixtures, perfiles o instrumentación de auditoría importados por runtime.

## Worker, solver y generación

- El Worker es un módulo dedicado con handshake y protocolo estrictos, IDs de petición únicos, validación de request/response y snapshot validado antes de responder.
- La persistencia ocurre en main después de validar la respuesta y antes de montar `GameScreen`.
- Web/PWA/Pages emiten un chunk Worker con base y hash propios. La APK debug lo incluye como asset local.
- Los tests comparan ejecución directa/Worker, protocolo, cancelación, montaje, paint, persistencia, migración y fallos de infraestructura.
- Diez fingerprints congelan Daily e Infinite D1–D5 para generador `g7`; todos pasaron. RNG, seeds, offsets, IDs y snapshots no divergieron.
- La observabilidad usa enums, contadores, semillas/offsets y tiempos; no contiene narrativa de casos ni datos personales y no se envía a red.
- El solver conserva el experimento row-major aprobado, con fallback semántico. No se abrió ningún Nivel B/C adicional.

### Rendimiento

| Medición | Resultado actual | Baseline documentado | Evaluación |
|---|---:|---:|---|
| Calidad D5, 50 puzzles | 14.928 ms | 15.587–38.568 ms | Sin regresión |
| Perfil D5, 20 muestras | media 315 ms; máximo 923 ms | media 322–850 ms; máximo 955–2.638 ms | Sin regresión |
| Perfil D5 | 20/20 éxitos; 27,1 solves medios; offset medio 4,2 | mismos conteos esperados | Determinista |
| Auditoría de reintentos | 50/50; 34 fallbacks; 0 fallos | mecanismo esperado | Correcto |

La muestra de calidad completa produjo 250/250 casos válidos, 181 fallbacks, 0 fallos, 4.249 llamadas de solver y máximo 23 candidatos. Un fallback significa que la entrada necesitó otro offset, no que se usara el fallback síncrono del Worker.

## Superficies de distribución

### Web y PWA

- Build de producción correcta: 468 módulos.
- Manifest: `MysteryCases`, español, `display: standalone`, colores `#151718`, scope/start `/` e iconos 64/192/512/maskable presentes.
- Workbox genera `sw.js`, limpia caches obsoletas y usa navegación fallback. El precache contiene 226 entradas y 112.986,87 KiB.
- `proceduralGeneration.worker-DJv38HNH.js` está en `dist`, aparece en `sw.js` y usa URL con hash.
- La actualización es explícita mediante `registerType: prompt`; el nuevo SW se activa al aceptar y recarga. Los nombres con hash y la instalación completa del precache reducen el riesgo de mezclar main y Worker. Un fallo de carga todavía degrada al fallback seguro.
- No se encontraron referencias absolutas `C:\...`, assets runtime inexistentes, Google Fonts remotas, telemetría o red de juego. La única URL externa de producto es la descarga deliberada del APK desde GitHub Releases.
- PWA instalada real: **no ejecutada**. No existe instalación Edge/Chrome disponible en este entorno.

### GitHub Pages

- `verify:pages` generó base, scope y start URL `/MysteryCases/`.
- `index.html` no contiene `/assets/` sin base; rutas hash y navegación son compatibles con Pages.
- El Worker Pages fue `proceduralGeneration.worker-BUg_zBn4.js`, incluido en el precache de esa build.
- El workflow de Pages ejecuta `npm ci`, lint, suite y `verify:pages` al publicar `main`.

### Android

| Campo | Valor comprobado |
|---|---|
| application/namespace | `com.mysterycases.app` |
| nombre | `MysteryCases` |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 |
| versión actual | `versionCode 2`, `versionName 1.1.0` |
| Capacitor | `webDir: dist`, sin `server.url` |
| permisos | `INTERNET` y permiso interno dinámico de AndroidX; sin cámara, ubicación, storage o notificaciones |
| cleartext | no se habilita `usesCleartextTraffic` ni configuración de red remota |

`verify:android` y la sincronización Capacitor pasaron. La APK debug se construyó con Gradle `--offline`; contiene el Worker desde assets empaquetados y no depende de una URL remota. Android WebView real: **no ejecutado**, porque `adb devices -l` estaba vacío y no había AVD configurado.

El material de firma, `keystore.properties`, las keystores y los APK release locales existen solo en rutas ignoradas. No hay secretos, keystores ni credenciales versionados; `android/keystore.properties.example` contiene únicamente nombres de campos de ejemplo. La clave local no se leyó ni se utilizó.

## Versionado y documentación

| Superficie | Valor | Estado |
|---|---|---|
| `package.json` | `1.1.0` | Consistente con lock, no con una release nueva |
| `package-lock.json` | `1.1.0` raíz/proyecto | Consistente; `npm ci --dry-run --offline` correcto |
| Android | `1.1.0` / code `2` | Consistente con la release ya publicada; bloquea actualización |
| PWA manifest | sin campo de versión | Esperado; identidad por SW/assets |
| título/labels | `MysteryCases` | Consistente en HTML, PWA y Android |
| tag existente | `v1.1.0` sobre `main` | Incompatible con etiquetar este HEAD igual |

Authoring, formato de casos, persistencia, Worker, observabilidad y auditorías describen los contratos actuales. Los informes históricos conservan cifras y hallazgos previos; sus cabeceras de actualización permiten distinguirlos. `docs/release-v1.1.0-validation.md` corresponde a la release ya etiquetada (77 archivos/489 tests y sin APK firmado), no a los 17 commits actuales. Mientras ambos conjuntos se llamen `1.1.0`, esa documentación resulta ambigua y no debe reutilizarse como evidencia de este HEAD.

## Higiene y seguridad

- `npm ls --all --offline` no encontró dependencias inválidas ni extraneous; `npm ci --dry-run --ignore-scripts --offline` confirmó coherencia package/lock.
- El cambio de lock es explicable: `ajv` pasa a dependencia runtime, `@capacitor/cli` a desarrollo y se elimina `@capacitor/assets` junto con su árbol antiguo. No se ejecutó auditoría online.
- No hay imports/exports rotos según TypeScript, Oxlint, tests y cuatro builds.
- No se encontraron logs de depuración, flags temporales, `debugger`, rutas locales Windows, telemetría o llamadas de red accidentales en producción.
- No se encontraron tokens, claves privadas o contraseñas versionadas. La coincidencia de búsqueda sensible es el archivo de ejemplo de firma, sin valores reales.
- No quedaron archivos temporales de esta auditoría.
- Existen artefactos grandes ya versionados en `main`, especialmente `exports/d1_assets_reference.zip` (48.379.744 bytes), `src/data/normal/frozen.ts` y fuentes de arte. No se incorporan completos al runtime salvo los assets importados y no fueron introducidos por estos 17 commits.

## Hallazgos clasificados

### Críticos

Ninguno.

### Altos

1. Identidad `v1.1.0`/`versionCode 2` reutilizada: bloquea tag y actualización Android.
2. `verify:android:release` acepta un APK obsoleto sin Worker: bloquea confiar o publicar el artefacto existente.

### Medios

1. PWA instalada no ejecutada: instalación, arranque standalone y actualización entre dos despliegues siguen pendientes.
2. Android WebView real no ejecutado: arranque, Back, background, rotación, process death, ANR y logcat siguen pendientes.
3. La documentación `release-v1.1.0-validation.md` es correcta como registro histórico, pero resulta ambigua mientras `pre` mantenga la misma versión.
4. Los verificadores PWA/Android no afirman explícitamente la presencia del Worker. La auditoría manual la confirmó para web/precache/debug APK, pero el falso positivo de release demuestra que el gate debe endurecerse.

### Bajos / riesgos aceptados

1. Vite avisa que el chunk principal supera 500 kB: 4.162,85 kB sin comprimir y 473,95 kB gzip. Es conocido y no causó fallo funcional.
2. El precache ronda 113 MB; puede competir por cuota en dispositivos limitados. La PWA instalada real sigue siendo el gate operativo.
3. Gradle avisa de `flatDir` y APIs obsoletas de cara a Gradle 9. La build actual con Gradle 8.14.3 pasa.
4. La seed Infinite puede repetir una seed histórica; evita solo la anterior. Es un riesgo probabilístico documentado, no una regresión de esta release.

## Validaciones ejecutadas

| Validación | Resultado | Duración de pared aproximada |
|---|---|---:|
| TypeScript `tsc -b` | Correcto | 13,232 s |
| Oxlint | Correcto | 1,094 s |
| Suite completa | 104 archivos, 719 tests | 9,099 s; 8,15 s Vitest |
| Dirigidos casos/persistencia/Worker/solver/RNG/fingerprints | 52 archivos, 344 tests | 8,205 s; 7,15 s Vitest |
| Todos los JSON publicados | 15 JSON + 15 registros correctos | 4,154 s |
| Casos Normal | 21 correctos | 6,574 s |
| Auditoría procedural | 50 solicitudes, 0 fallos | 8,420 s |
| Calidad procedural | 250 puzzles, 0 fallos | 27,523 s |
| Perfil D5 | 20/20; media 315 ms, máximo 923 ms | 8,694 s |
| Build web | Correcta; 468 módulos | 17,400 s |
| `verify:pwa` | Correcto; 226 entradas | 11,555 s |
| `verify:pages` | Correcto | 12,570 s |
| `verify:android` | Correcto | 14,489 s |
| APK debug Gradle `--offline` | `BUILD SUCCESSFUL` | 3,201 s |
| `verify:android:release` | Script código 0, pero gate de contenido fallido por APK obsoleto | 14,693 s |
| `npm ls --all --offline` | Correcto | 3,220 s |
| `npm ci --dry-run --ignore-scripts --offline` | Correcto | 1,089 s |
| `git diff --check` | Correcto; solo avisos LF/CRLF en dos archivos generados de Capacitor | <1 s |

El primer intento de la suite no llegó a cargar Vite por `spawn EPERM` dentro del sandbox. La misma orden pasó fuera de ese aislamiento; no es un fallo del proyecto. Al ejecutar tres herramientas Vite en paralelo aparecieron dos avisos de puerto HMR `24678` ya ocupado, pero las herramientas terminaron con código 0 y resultados completos; no corresponden a runtime ni a las mediciones de rendimiento, que se ejecutaron en exclusión.

### Hashes relevantes

| Artefacto | Tamaño | SHA-256 |
|---|---:|---|
| APK debug actual | 119.590.000 bytes | `50AB297EFDA224846C3E6BC7ECAB6175D4C846360E58F8803E2EBE005DAF693A` |
| Worker web/Android actual | 94.515 bytes | `4DFED317830938027E1D61213D864E836A44A6671F8D9F2AA03DC8602B593336` |
| `sw.js` build base `/` | 14.388 bytes | `416B3AF166C568F4D201B707107F52C7C08339B4A12E70632AA8778A6B022C5F` |
| `package-lock.json` | 315.728 bytes | `42E7BE432DA68F78EAC84A766B17EC72672B6E3692CA1F9F8BA895CCA05114EF` |
| APK release local obsoleta | 117.091.758 bytes | `2197BEFCE61870E1ED8CDAE5CBBBEF5B67128F6AA21DF09428A46AA914CCAE7E` |

## Validaciones no ejecutadas

- Instalación y actualización de una PWA standalone real.
- Android WebView en dispositivo o emulador, instalación del APK, logcat, ANR, Back, rotación y process death.
- Build release firmada del HEAD actual: no se usó la keystore ni se solicitó contraseña.
- Publicación de Pages, tag, GitHub Release o APK.
- Auditoría online de dependencias.

## Checklist manual pendiente

### PWA instalada

1. Publicar primero un build controlado anterior en un origen de prueba HTTPS e instalarlo como PWA.
2. Crear Daily e Infinite con V2 y un Normal con `CaseSave V4`; cerrar y abrir en frío/caliente.
3. Publicar el candidato final en el mismo origen.
4. Confirmar aviso `NUEVA VERSIÓN DISPONIBLE`, aceptar, recargar y verificar que HTML, main y Worker pertenecen al mismo build.
5. Cortar red y probar arranque, restauración V2 sin Worker, Daily/Infinite, cancelación y carga del chunk Worker desde Cache Storage.
6. Revisar consola, red, Cache Storage y almacenamiento antes/después. Confirmar cero requests inesperadas y conservar progreso válido.
7. Desinstalar la PWA o limpiar exclusivamente el perfil de prueba.

### Android real

1. Generar una APK firmada nueva desde el commit/versionCode corregidos; registrar hash antes de instalar.
2. Instalar como actualización sobre la versión anterior con la misma firma y confirmar que el sistema acepta el `versionCode` mayor.
3. Verificar conservación de Normal, Daily V2, Infinite V2, preferencias y migraciones legacy controladas.
4. Probar arranque frío/caliente y completamente offline; inspeccionar WebView y confirmar Worker desde `https://localhost/.../assets`, no desde red.
5. Ejecutar Daily e Infinite D1/D2 y D5 mediante una superficie de auditoría aprobada; medir main, cancelar y abandonar durante generación.
6. Probar Back, background/foreground, rotación permitida, cierre desde recientes y `am force-stop` con restauración V2 sin regeneración.
7. Revisar `adb logcat` por crash, ANR, renderer, Worker, CSP/MIME, storage y assets.
8. Limpiar datos o desinstalar el paquete de prueba al terminar.

## Plan mínimo de corrección

1. Resolver la identidad de release: nueva versión SemVer y `versionCode > 2` en todos los puntos declarativos y documentos.
2. Endurecer `verify:android:release` para rechazar APK antiguas o sin los assets del build sincronizado.
3. Construir una APK release firmada nueva desde un working tree limpio y verificar firma, versión, Worker, inventario y hash.
4. Repetir la matriz automatizada y los dos checklists manuales en superficies reales.
5. Actualizar la documentación de release con resultados y hashes del candidato definitivo.

No es necesario cambiar solver, generador, RNG, seeds, snapshots, persistencia o casos para resolver los bloqueadores observados.

## Checklist exacto de promoción y publicación

No se ejecutó ninguno de estos pasos. Deben realizarse solo después de resolver los bloqueadores:

1. Elegir una identidad de release que no exista y actualizar versiones/documentación en una revisión separada.
2. Confirmar `pre` limpia, sincronizada con su upstream y revisar el diff completo contra `origin/main`.
3. Ejecutar TypeScript, Oxlint, suite, batería dirigida, casos/JSON, calidad, perfil, builds y verificadores.
4. Retirar de forma segura los APK release antiguos del área de build, construir el candidato firmado desde el HEAD final y ejecutar el verificador endurecido.
5. Ejecutar PWA instalada y Android real; registrar navegador/WebView/dispositivo, hashes y resultados.
6. Aprobar el informe final sin hallazgos altos abiertos.
7. Promover `pre` a `main` mediante el flujo de revisión del repositorio, sin reescribir historia, y esperar el CI de Pages.
8. Confirmar que el commit de `main` publicado es exactamente el aprobado.
9. Crear un tag anotado nuevo sobre ese commit; nunca mover `v1.1.0` ni usar `--force`.
10. Publicar la GitHub Release asociada al tag y adjuntar exclusivamente la APK firmada verificada como `MysteryCases.apk`.
11. Comprobar la URL estable de descarga, la Pages pública, actualización PWA y actualización Android desde la versión anterior.
12. Conservar SHA-256, versión, `versionCode`, commit y checklist manual como evidencia de release.

## Estado final de la auditoría

No se modificó producción, versiones, dependencias, solver, generador, RNG, seeds, snapshots, persistencia ni casos. No se hizo commit, push, merge, tag, release o publicación y no se usó la red. El único cambio permitido y producido por esta auditoría es este informe.
