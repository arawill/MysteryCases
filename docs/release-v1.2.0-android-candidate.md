# Candidato Android release firmado de MysteryCases 1.2.0

Fecha: 2026-10-01  
Sistema: Windows 10.0.22631, AMD64  
Rama: `pre`  
Commit: `d02617155e1d8d4fae030a3ba1ed8e32c2d2c2af`  
Upstream: `origin/pre`, divergencia `0/0`  
Estado inicial: working tree limpio

## Veredicto

**CANDIDATO ANDROID VÁLIDO.**

La APK release firmada se construyó limpiamente y sin red desde el commit indicado. Superó la verificación de firma, identidad, modo no depurable, assets, Worker y continuidad del certificado con `v1.1.0`. La copia preparada es byte a byte idéntica al artefacto verificado y superó nuevamente el gate estricto.

Este resultado no publica el artefacto. La actualización real en dispositivo, Android WebView real y la PWA instalada continúan sin ejecutarse por falta de una superficie conectada.

## Identidad y estado histórico

- Proyecto: `1.2.0`.
- Android package: `com.mysterycases.app`.
- Android `versionName`: `1.2.0`.
- Android `versionCode`: `3`.
- APK no depurable: confirmado (`application-debuggable` ausente).
- `server.url`: ausente.
- Tag histórico `v1.1.0`: objeto `9755fed54217142c6aac35d110c18c76c6a4d686`, todavía dirigido al commit `b48cfec091461a096d75929dc3e75c17e87f30a8`.

Antes de sustituir cualquier copia se registró el APK local histórico `v1.1.0`:

| Dato | Valor |
|---|---|
| Tamaño | 117.091.758 bytes |
| SHA-256 | `2197BEFCE61870E1ED8CDAE5CBBBEF5B67128F6AA21DF09428A46AA914CCAE7E` |
| Package | `com.mysterycases.app` |
| Version | `1.1.0` / code `2` |
| Algoritmo de fingerprint | SHA-256 |
| Fingerprint público | `4260E107F28D38E3F094A358E318E5C04DCBF4255BB688D68B5F75C96F64BFCF` |

No se abrió ni imprimió la configuración local de firma, no se mostró ningún alias, DN o contraseña y no se copió ni modificó la keystore.

## Validación previa

Todas las comprobaciones terminaron correctamente antes de iniciar la construcción release:

| Comprobación | Resultado |
|---|---|
| TypeScript (`tsc -b`) | Correcto |
| Oxlint con warnings denegados | Correcto |
| Suite completa | 105 archivos, 736 tests superados |
| Contratos del gate Android | 17 tests superados |
| JSON publicados | 15 JSON y 15 entradas de runtime validados |
| Casos Normal | 21 casos publicados verificados |
| Fingerprints, RNG y snapshots | 5 archivos dirigidos, 24 tests superados |
| Build web | Correcto |
| `verify:pwa` | Correcto; 226 entradas precacheadas |
| `verify:pages` | Correcto |
| `verify:android` | Correcto |
| `git diff --check` | Correcto |

Las pruebas dirigidas incluyeron fingerprints procedurales, invariancia y consumo de RNG, generación aleatoria, snapshots procedurales y snapshots del protocolo Worker.

## Construcción limpia

Después del build y sync Android desde el HEAD actual se ejecutó:

```text
gradlew.bat clean assembleRelease --offline
```

Resultado: `BUILD SUCCESSFUL`, 128 tareas (`117 executed`, `11 up-to-date`). La limpieza se limitó a directorios de build generados. Gradle consumió directamente la configuración local existente; no se reparó, modificó ni expuso material de firma.

## Herramientas utilizadas

| Herramienta | Versión |
|---|---|
| Node.js | `24.20.0` |
| npm | `11.19.0` |
| Java | OpenJDK `21.0.12.1` LTS |
| Gradle | `8.14.3` |
| Android Build Tools | `36.0.0` |
| AAPT2 | `2.20-13193326` |
| apksigner | `0.9` |

No se descargaron herramientas ni dependencias y no se utilizó la red.

## APK verificada

Artefacto generado: `android/app/build/outputs/apk/release/app-release.apk`.

| Dato | Valor |
|---|---|
| Tamaño | 117.173.470 bytes |
| SHA-256 | `BE828FD4DC4F204A87FB2C59566583CBD7D041C12A6ACECD9D4EC4C0AFF74A3F` |
| Package | `com.mysterycases.app` |
| Version | `1.2.0` / code `3` |
| Depurable | No |
| Assets públicos | 226, inventario y contenido coincidentes |
| Worker | `assets/proceduralGeneration.worker-DJv38HNH.js` |
| Worker SHA-256 | `4DFED317830938027E1D61213D864E836A44A6671F8D9F2AA03DC8602B593336` |
| Chunks Worker | Exactamente 1 |

El gate confirmó firma válida mediante `apksigner`, metadatos mediante AAPT2, ausencia de archivos antiguos/ausentes/adicionales/diferentes y coincidencia exacta entre el contenido empaquetado y `android/app/src/main/assets/public`. La configuración Capacitor no contiene `server.url`; el APK usa los assets empaquetados.

## Continuidad del certificado

Solo se registró el dato público necesario:

- Algoritmo: SHA-256.
- Fingerprint de `v1.1.0`: `4260E107F28D38E3F094A358E318E5C04DCBF4255BB688D68B5F75C96F64BFCF`.
- Fingerprint del candidato `1.2.0`: `4260E107F28D38E3F094A358E318E5C04DCBF4255BB688D68B5F75C96F64BFCF`.
- Coincidencia exacta: **sí**.

La continuidad criptográfica necesaria para una actualización Android queda confirmada. Esto no sustituye la instalación real sobre un dispositivo existente.

## Preparación y segunda verificación

`npm run android:prepare:release` volvió a construir y sincronizar los assets actuales, ejecutó el gate estricto y preparó `release/MysteryCases.apk`.

| Ruta lógica | Tamaño | SHA-256 |
|---|---:|---|
| APK de build | 117.173.470 bytes | `BE828FD4DC4F204A87FB2C59566583CBD7D041C12A6ACECD9D4EC4C0AFF74A3F` |
| Copia preparada | 117.173.470 bytes | `BE828FD4DC4F204A87FB2C59566583CBD7D041C12A6ACECD9D4EC4C0AFF74A3F` |

Resultado de comparación: **byte a byte idénticas**. El gate estricto se ejecutó después directamente sobre la copia preparada y volvió a verificar firma, `1.2.0`/code `3`, los 226 assets y el Worker con el mismo SHA-256.

Ambas APK permanecen ignoradas por Git. No se subió ni publicó ninguna copia.

## Pruebas no ejecutadas

- Instalación y actualización real `v1.1.0` → `1.2.0`: **no ejecutada**. ADB `platform-tools` estaba disponible, pero no había dispositivo ni emulador conectado. No se creó ni descargó ninguno.
- Android WebView real: **no ejecutado** por ausencia de dispositivo/emulador.
- PWA instalada real: **no ejecutada** en esta fase; los builds y `verify:pwa` no se consideran sustitutos.

## Warnings conocidos

- Vite avisa de un chunk principal superior a 500 kB tras minificación.
- Gradle avisa del uso de repositorios `flatDir` sin metadatos.
- La compilación Java de Capacitor informa de operaciones unchecked/unsafe.
- Gradle informa de características deprecadas que deberán revisarse antes de Gradle 9.0.

Ninguno de estos warnings bloqueó la construcción ni las verificaciones exigidas para este candidato.

## Estado de publicación

El candidato Android firmado es válido y está preparado localmente, pero no ha sido publicado. No se realizó commit, push, merge, tag, GitHub Release, publicación en Pages ni subida a tienda.
