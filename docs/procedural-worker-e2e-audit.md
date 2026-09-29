# Auditoría E2E del Worker procedural

Fecha: 2026-09-29  
Rama: `pre`  
HEAD auditado: `b9796c987b94fe0f679912618cd0cde19135afb8`  
Upstream inicial: `origin/pre`, divergencia `0/0`  
Working tree inicial: limpio

## Conclusión

No se reprodujeron defectos de la aplicación en las superficies disponibles. El Worker real, el Service Worker, la persistencia, la migración, el fallback y las invalidaciones superaron las pruebas en Edge 154 con build de producción.

Dos superficies requeridas no estaban disponibles y se clasifican como **no ejecutadas**, no como superadas:

- **PWA instalada real:** no ejecutada. No existía una instalación previa y las interfaces disponibles no permitieron instalarla de forma controlable.
- **Android WebView real:** no ejecutado. No había dispositivo conectado ni AVD creado.

Además, D5 no es seleccionable actualmente desde la UI: el catálogo Normal publicado solo permite desbloquear D1 y D2. D5 se validó directamente contra el Worker real, online y offline, pero no se considera un E2E completo de UI y persistencia.

## Entorno

| Elemento | Evidencia |
|---|---|
| Sistema | Windows 10.0.22631 |
| Navegador | Microsoft Edge `154.0.4258.37`, UA `Edg/154.0.0.0` |
| Tipo de ejecución web | Edge real, build Vite de producción servido en `http://127.0.0.1:4173/` |
| Worker | Módulo `assets/proceduralGeneration.worker-DJv38HNH.js` |
| Service Worker | `sw.js`, scope `http://127.0.0.1:4173/`, estado `activated` |
| ADB | `1.0.41`, plataforma `37.0.1-15733141` |
| Android configurado | `com.mysterycases.app`, minSdk 24, targetSdk 36 |
| APK debug final | 119.590.000 bytes, SHA-256 `50AB297EFDA224846C3E6BC7ECAB6175D4C846360E58F8803E2EBE005DAF693A` |

Toda la instrumentación se inyectó en un perfil Edge temporal mediante CDP. No se modificaron bundles, código de producción, almacenamiento real del usuario ni reloj global del sistema.

## Disponibilidad de superficies

### PWA instalada

La inspección de perfiles encontró:

- Edge `Default` sin directorio `Web Applications`.
- Ningún acceso directo `MysteryCases` en Inicio o Escritorio.
- Chrome no instalado en el perfil local consultado.
- Computer Use sin apps ni navegadores expuestos; el proveedor nativo de Windows tampoco estaba configurado.

Edge publicaba un dominio CDP experimental `PWA`, pero tanto el target de navegador como el de página rechazaron `PWA.getOsAppState` con `method wasn't found`. Los intentos terminaron antes de `PWA.install`; no se instaló ninguna aplicación. La medición confirmó `display-mode: standalone = false`.

Por tanto, quedaron **no ejecutados**: instalación, arranque frío/caliente de la app instalada, cierre/reapertura de su ventana, background real del shell instalado y navegación Atrás propia de esa superficie.

### Android WebView

Las herramientas existían en `C:\Users\felix\AppData\Local\Android\Sdk`, pero:

- `adb devices -l`: lista vacía.
- `emulator -list-avds`: lista vacía.
- No había proceso de emulador o dispositivo disponible.

No se creó ni descargó ningún AVD, SDK o herramienta. Instalación, WebView runtime, logcat, Back Android, rotación y process death quedaron **no ejecutados**.

## Evidencia reproducible en Edge

### UI real y persistencia

Las cuatro generaciones accesibles produjeron una solicitud, una escritura de sesión y `GameScreen` solo después de existir V2.

| Caso | clic→status | clic→frame status | clic→GameScreen | Worker: generación | snapshot + validación | Long tasks main |
|---|---:|---:|---:|---:|---:|---:|
| Infinite D1 | 0,9 ms | 2,1 ms | 21,5 ms | 8,6 ms | 2,5 ms | 0 |
| Infinite D2 | 0,6 ms | 3,5 ms | 31,6 ms | 17,4 ms | 2,8 ms | 0 |
| Daily D1 | 0,8 ms | 3,0 ms | 22,5 ms | 8,1 ms | 2,6 ms | 0 |
| Daily D2 | 0,9 ms | 6,4 ms | 31,7 ms | 15,5 ms | 3,7 ms | 0 |

Observado en todos los casos:

- Status accesible antes del resultado.
- Worker módulo con la URL hash esperada.
- Una sola petición.
- Persistencia presente antes de detectar `.scene`.
- Infinite consumió una seed; Daily no llamó a `crypto.getRandomValues`.

### D5 y responsividad de main

Se usó la seed reproducible `54384793` en Infinite D5. La página estaba `visible` y con foco.

| Estado | Muestras | Tiempo Worker | Ticks main de 10 ms | Latencia máxima | Long tasks main |
|---|---:|---:|---:|---:|---:|
| Online | 3/3 | 736,4–741,3 ms | 74 por muestra | 1,4 ms | 0 |
| Offline | 3/3 | 735,2–770,0 ms | 73–77 por muestra | 1,4 ms | 0 |

Daily D5 también respondió correctamente por el Worker real: 182,9 ms online y 292,2 ms en una muestra offline. Estas rutas directas validan carga, protocolo y responsividad, pero no sustituyen el E2E UI D5 pendiente.

### Offline

Con `Network.emulateNetworkConditions.offline = true` y documento controlado por el Service Worker:

- Infinite y Daily D1/D2 generaron, persistieron y mostraron `GameScreen`.
- Infinite y Daily D5 respondieron mediante Worker directo.
- `caches.match(workerUrl)` devolvió `true`.
- El Worker se creó desde `http://127.0.0.1:4173/assets/proceduralGeneration.worker-DJv38HNH.js`.
- No hubo `Network.loadingFailed` inesperados.
- Se observaron respuestas servidas por el Service Worker.
- No hubo excepciones no controladas ni logs de nivel error.

### Cancelación, repetición e invalidación

Para evitar una carrera dependiente de la seed, el harness retrasó temporalmente la entrega del mensaje Worker; no cambió la generación.

- Cancelar: una solicitud, un `terminate()`, sesión ausente.
- Generar después de cancelar: segundo Worker, segunda solicitud, V2 persistida y `GameScreen` posterior.
- Doble activación: una llamada a RNG, un Worker, una solicitud y una escritura de sesión.
- Recarga durante generación: antes de recargar no había V2; 500 ms después seguían ausentes V2 y `GameScreen`, con cero Workers del documento anterior.
- Navegación Atrás durante generación: volvió a `#/`, terminó el Worker y no persistió.
- Background/foreground simulado con `Page.setWebLifecycleState`: tras reactivar apareció `GameScreen` con V2 ya persistida. Esto no equivale al background de una PWA instalada.

### Restauración, migración, fallback y rollover

- Restauración V2: recarga con `GameScreen`, cero Workers y cero solicitudes.
- Migración V1 Infinite: shell a 124,7 ms, frame a 124,8 ms y construcción del Worker a 129,2 ms. Conservó seed `98765`, dificultad D1 y `status: completed`, produciendo V2.
- Fallback por constructor Worker forzado: status a 1,5 ms, frame a 2,0 ms y `GameScreen` a 22,9 ms. Hubo un intento de constructor, cero posts, cero long tasks y persistencia anterior a `.scene`.
- Rollover Daily determinista: se sustituyó `Date` solo dentro del documento, se avanzó un día y se disparó `focus`. Apareció el aviso, hubo un `terminate()`, no se persistieron sesión ni juego.

### Arranque

La navegación del tab de producción midió 141,7 ms en la primera muestra y 169,2 ms en una recarga posterior. No se presentan como arranque frío/caliente de PWA instalada porque `display-mode` no era standalone.

Al finalizar las pruebas, `localStorage.length` y `sessionStorage.length` eran cero.

## Hallazgos

### Críticos

Ninguno reproducido.

### Altos

Ninguno reproducido.

### Medios

1. **Cobertura no demostrada: PWA instalada.** Limitación del entorno. Impacta instalación, shell standalone, cierre/reapertura y background real. No hay evidencia de defecto ni de éxito.
2. **Cobertura no demostrada: Android WebView.** Limitación del entorno. Build y empaquetado no demuestran runtime, ANR, logcat, Back o process death.
3. **Cobertura no demostrada: D5 completo desde UI.** Riesgo de prueba. El catálogo actual publica D1/D2 y mantiene D3–D5 no desbloqueables; alterar `localStorage` no puede eludir la normalización. El Worker D5 está probado, pero no su flujo UI→persistencia→`GameScreen`.

### Bajos

1. **Automatización PWA de Edge inconsistente.** El esquema CDP anuncia `PWA.*`, pero el runtime rechaza esos métodos. Es una limitación de la herramienta/navegador, no del proyecto.

### Defectos reproducibles de MysteryCases

Ninguno en la superficie ejecutada. No se propone corrección de producción.

## Protocolo manual Android pendiente

Este protocolo debe ejecutarse en un móvil o AVD ya provisionado, sin descargar componentes durante la auditoría.

1. Confirmar dispositivo y WebView:

   ```powershell
   adb devices -l
   adb shell cmd webviewupdate getCurrentWebViewPackage
   adb shell getprop ro.build.version.release
   adb shell wm size
   ```

2. Verificar e instalar exactamente el APK auditado:

   ```powershell
   Get-FileHash -Algorithm SHA256 android/app/build/outputs/apk/debug/app-debug.apk
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   adb shell pm path com.mysterycases.app
   ```

3. Limpiar logs y medir arranque frío/caliente:

   ```powershell
   adb logcat -c
   adb shell am force-stop com.mysterycases.app
   adb shell am start -W -n com.mysterycases.app/.MainActivity
   adb shell am start -W -n com.mysterycases.app/.MainActivity
   ```

4. Abrir `edge://inspect` o `chrome://inspect` en escritorio y seleccionar el WebView `com.mysterycases.app`. Confirmar:

   - origen local de Capacitor, normalmente `https://localhost`;
   - Worker dedicado `proceduralGeneration.worker-*.js` desde assets locales;
   - ausencia de solicitudes HTTP externas;
   - consola sin excepciones;
   - Application/Local Storage antes y después de cada prueba.

5. Con red disponible, ejecutar UI D1 y el máximo nivel realmente desbloqueado. Para D5, usar una build/fixture de auditoría aprobado que desbloquee el nivel sin modificar generador, RNG o persistencia; con la build actual no es alcanzable desde UI. Registrar clic→status, frame, Worker, V2 y `GameScreen`.

6. Desactivar Wi-Fi y datos desde el dispositivo. Repetir arranque frío y las generaciones. Confirmar en DevTools que el Worker procede de assets empaquetados y que no hay red satisfactoria.

7. Durante una generación lenta:

   - pulsar `CANCELAR` y comprobar ausencia de V2;
   - iniciar otra generación;
   - pulsar Back y comprobar ausencia de respuesta tardía;
   - enviar la app a segundo plano 10 s y recuperarla;
   - rotar el dispositivo si la Activity lo permite;
   - cerrar desde recientes y reabrir.

8. Con una V2 persistida, simular process death y reabrir:

   ```powershell
   adb shell am force-stop com.mysterycases.app
   adb shell am start -W -n com.mysterycases.app/.MainActivity
   ```

   Confirmar `GameScreen`, cero nueva solicitud Worker y snapshot sin cambios.

9. Revisar logs:

   ```powershell
   adb logcat -d -v threadtime AndroidRuntime:E chromium:E Capacitor:E WebView:E ActivityManager:W *:S
   adb shell dumpsys activity processes | Select-String com.mysterycases.app
   ```

   Buscar crash, ANR, `Renderer process crash`, carga fallida del Worker, CSP/MIME, excepciones de almacenamiento y errores de assets.

10. Registrar hash, modelo, Android, WebView, tiempos y estado de almacenamiento. Finalmente eliminar datos de auditoría o desinstalar la APK y restaurar conectividad:

   ```powershell
   adb shell pm clear com.mysterycases.app
   adb uninstall com.mysterycases.app
   ```

## Validación final

Toda la instrumentación temporal se retiró antes de esta validación.

| Validación | Resultado |
|---|---|
| TypeScript (`npx tsc -b --pretty false`) | Superada |
| Oxlint (`npm run lint`) | Superada |
| Pruebas dirigidas Worker/persistencia/lifecycle | 6 archivos, 28 pruebas superadas |
| Suite completa (`npm test`) | 104 archivos, 719 pruebas superadas |
| `npm run verify:pwa` | Superada; 226 entradas precacheadas |
| `npm run verify:pages` | Superada |
| `npm run verify:android` | Superada; sincronización Capacitor y verificador Android correctos |
| `gradlew.bat assembleDebug --offline` | Superada; `BUILD SUCCESSFUL` |
| Worker dentro de la APK | `assets/public/assets/proceduralGeneration.worker-DJv38HNH.js` |
| `git diff --check` | Superada |

La APK final es `android/app/build/outputs/apk/debug/app-debug.apk`, de 119.590.000 bytes, con SHA-256 `50AB297EFDA224846C3E6BC7ECAB6175D4C846360E58F8803E2EBE005DAF693A`. La inspección del ZIP confirmó que el chunk del Worker está empaquetado en los assets de la aplicación; esto prueba empaquetado, no su ejecución en WebView.

Tras la limpieza, no quedaron scripts de auditoría, perfil temporal de Edge, procesos Edge asociados ni servidor ADB de la auditoría. `localStorage` y `sessionStorage` del perfil temporal estaban vacíos antes de eliminarlo. El único cambio final del working tree es este informe.
