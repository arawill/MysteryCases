# MysteryCases v1.1.0

## Public campaign

The public Normal catalog is defined only in `src/game/normal/availability.ts`: D1/C01-C15 and D2/C01-C06, 21 cases. D3-D5 display an unavailable state. Routes, navigation, counts, statistics and verification share this catalog.

`verify:normal-cases` resolves the published descriptors using the production generator and checks structure, satisfied clues, victim without clues, unique canonical solution without truncation, killer and duplicate IDs. Existing case and D2 quality tests remain enabled. Future frozen cases are excluded from publication, not deleted or exempted within the public catalog. Daily and Infinite retain their generators.

Normal progress retains valid historical case numbers on reads and writes. Public counts ignore unpublished entries. Existing future achievement thresholds remain intact. Invalid routes redirect before case generation or save lookup. D2/C06 has no next case.

Regression tests cover all published bounds, route rejection without frozen lookups, public archive links, future difficulty labels, historical saves and end-of-campaign navigation. Neither frozen artifact nor any case gameplay was edited.

## Auditoría de dependencias (21 de septiembre de 2026)

`npm audit --omit=dev --json` devuelve 3 vulnerabilidades moderadas, 0 altas y
0 críticas. Las moderadas corresponden a `@capacitor/cli@8.5.1` →
`xcode@3.0.1` → `uuid@7.0.3`. El CLI está declarado como dependencia, pero
es una herramienta de compilación y no se importa desde `src`.

La auditoría completa devuelve 8 paquetes afectados: 3 moderados, 4 altos y
1 crítico. Los altos/crítico pertenecen a herramientas de desarrollo:

- `@capacitor/assets@3.0.5` → `@capacitor/cli@5.7.8` → `tar@6.2.1`
  (tar crítico; assets y CLI altos).
- `@capacitor/assets@3.0.5` → `sharp@0.32.6` (alto).
- `@vite-pwa/assets-generator@1.0.2` → `sharp@0.33.5` (ambos altos).
- `@trapezedev/project@7.1.10`, `xcode@3.0.1` y `uuid@7.0.3`
  explican los tres paquetes moderados de la auditoría completa.

El CLI principal usa `tar@7.5.22`, no la copia vulnerable 6.2.1. Estas
herramientas generan assets/configuración; no son imports del código cliente.
No se ejecuta `npm audit fix` ni se cambian versiones de dependencias.

## Validación de publicación

- Lint y build correctos.
- Suite completa: 77 archivos, 489 tests correctos.
- Tests dirigidos: 47 archivos, 281 tests correctos.
- Verificador Normal: exactamente 21 casos publicados.
- Calidad procedural: 250 puzzles verificados en D1-D5.
- Verificaciones PWA, Pages y configuración Android correctas.
- Auditoría de producción: 3 moderadas, 0 altas, 0 críticas.
- Bundle superior a 500 kB: aviso conocido no bloqueante.

Se intentó `android:build:release`, que construye con base `/`, sincroniza
Capacitor y ejecuta `assembleRelease`. El empaquetado falló al desbloquear
la clave de firma local. No se genera ni adjunta un APK para v1.1.0 y no
se sustituye por un debug ni por el APK antiguo. La web puede publicarse.
No se modificó ni expuso material de firma. Gradle también avisa del uso
de características obsoletas para una futura actualización a Gradle 9.

No había navegador conectado para inspección visual interactiva. Las rutas
se verifican mediante pruebas del componente real, y el despliegue mediante
HTTP y comparación de assets con el build validado.
