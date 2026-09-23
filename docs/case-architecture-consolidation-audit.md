# Auditoría final de consolidación de la arquitectura de casos

Fecha: 23 de septiembre de 2026.

## Resultado

La arquitectura de C01–C15 queda consolidada sobre JSON versionado con `schemaVersion: 1`. Solo se encontró un residuo inequívocamente muerto de las antiguas definiciones TypeScript: el helper `legacyObject`. No se eliminó ningún wrapper, fixture, firma, test, asset, export contractual ni script porque todos conservan consumidores o una función de regresión demostrable.

No se modificaron JSON, contenido narrativo, soluciones, schema, validaciones, registros, Daily, Infinite, generación procedural ni configuración de distribución.

## Grafo y comprobaciones de consumidores

El camino de producción comprobado es:

```text
main.tsx
  → App.tsx / NormalCaseScreen.tsx
  → game/normal/generator.ts
  → data/cases/manualNormalCases.ts
  → data/cases/caseNNN.ts
  → data/cases/json/caseNNN.json
  → game/cases/loadSerializedCase.ts
  → JSON Schema + validación semántica + caseAssetRegistry
  → GameCase
```

C01 también tiene consumo directo desde `App.tsx`, el generador Normal y tooling. C02–C15 están registrados en `manualNormalCases`; todos los wrappers tienen además consumidores directos en tests. La búsqueda de `import()`, `import.meta.glob` y `require()` en `src`, `scripts` y configuración no encontró mecanismos dinámicos. Tampoco aparecieron rutas de casos construidas como strings.

Las 76 claves declaradas en `caseAssetRegistry` coinciden exactamente con las 76 claves distintas referenciadas por los JSON C01–C15: no hay claves huérfanas ni referencias sin registrar. El build de Vite confirmó que los assets resueltos forman parte de las salidas web/PWA; Pages usa el mismo build con base propia y Android consume `dist` mediante Capacitor.

## Seguro de retirar

### Código simplificado

- Retirado `legacyObject` de `src/data/cases/manualCaseHelpers.ts` (cuatro líneas). La búsqueda global solo devolvía su declaración. El grafo histórico confirma que sus últimos consumidores eran las definiciones TypeScript pre-migración de C04–C07, C09, C11 y C14. Los wrappers actuales cargan JSON y ningún registro, test, script o build resuelve helpers por nombre o ruta dinámica.

### Archivos eliminados

- Ninguno. No se encontró ningún archivo completo que cumpliera simultáneamente los cinco criterios obligatorios de eliminación.

## Debe conservarse

- `case001.ts`–`case015.ts`: son la API interna estable; forman parte del grafo de runtime y tienen múltiples consumidores de tests y tooling.
- `manualNormalCases.ts`: registra C02–C15 y los seis casos manuales D2; lo consultan el generador Normal, la validación del catálogo y tests.
- `caseAssetRegistry.ts`: es el límite único entre claves portables y assets del bundler. Todas sus claves tienen consumidor JSON actual.
- Loader, `schemaVersion`, tipos serializados, JSON Schema y validación Ajv/semántica: componen el contrato de entrada y rechazan versiones, estructura, referencias y reglas de dominio inválidas.
- `legacyCase001.ts` y `legacyCase002.ts`: son fixtures independientes que prueban equivalencia estructural completa, no duplicados usados por producción.
- `legacyNormalCaseSignatures.test.ts`: sus trece huellas congeladas son la garantía de equivalencia pre-migración de C03–C15; se conserva de forma deliberada.
- `caseSerialization.test.ts` y `remainingCaseSerialization.test.ts`: cubren responsabilidades distintas. El primero prueba el contrato y casos negativos; el segundo aplica schema y loader a cada JSON C03–C15. El nombre del segundo es histórico, pero cambiarlo o fusionarlo no elimina cobertura ni dependencia legacy.
- Tests específicos C01–C15, de registro, diversidad y acusación: protegen propiedades de gameplay que una huella o el schema por sí solos no demuestran.
- `contextualObject` y `createManualBoard`: siguen siendo consumidos por los seis casos manuales D2. No se migraron ni alteraron.
- Scripts `freeze:normal-cases` y `verify:normal-cases`: tienen consumidores documentados en `package.json`; el primero mantiene el catálogo congelado histórico y el segundo valida el catálogo publicado.
- Ruta directa `/case/case001`: tiene consumidor de producción y puede constituir compatibilidad externa; no se altera.
- Daily, Infinite y generación procedural: sus generadores no dependen del loader serializado y permanecen funcionalmente intactos.

## Dudoso; no retirado

- El catálogo congelado admite descriptores históricos más allá de los 21 casos publicados. Tooling y compatibilidad con datos congelados impiden demostrar que sea eliminable sin redefinir la arquitectura pública.
- `exports/d1_assets_reference.zip` no tiene consumidor de código, pero parece un entregable externo intencional; una búsqueda de imports no permite autorizar su borrado.
- `dist/`, `release/`, `artifacts/` y los outputs de `android/app/build` son generados e ignorados. Pueden contener entregables locales y se dejaron intactos.
- Los documentos de diseño individuales de casos pueden servir fuera del build. No se deduce su obsolescencia de que no participen en el grafo TypeScript.

## Validación

Todas las comprobaciones se ejecutaron sin red ni actualización de dependencias:

- `npx tsc -b`: correcto.
- `npm run lint`: correcto, sin diagnósticos.
- Tests específicos de serialización, firmas y casos manuales D2: 9 archivos y 71 tests correctos.
- `npx vitest run`: 80 archivos y 530 tests correctos.
- `npm run build`: correcto; 446 módulos transformados y PWA generada con 225 entradas de precache.
- `npm run verify:normal-cases`: 21 casos Normal publicados correctos.
- `npm run verify:pwa`: build y verificador PWA correctos.
- `npm run verify:pages`: build Pages, verificador PWA y verificador Pages correctos.
- `npm run verify:android`: build web, `cap sync android` y verificador Android correctos.
- `android/gradlew.bat assembleDebug --offline`: `BUILD SUCCESSFUL`; 93 tareas, 27 ejecutadas y 66 actualizadas.
- `git diff --check`: correcto, sin errores de whitespace. Git muestra únicamente avisos locales de futura conversión LF→CRLF.

Vitest y Vite no pudieron iniciar dentro del sandbox de procesos de Windows (`spawn EPERM`); las mismas órdenes se repitieron fuera de ese aislamiento, sin red, y finalizaron correctamente. Permanecen las advertencias no bloqueantes ya conocidas: chunk principal superior a 500 kB, uso de `flatDir`, diferencia de versión XML del SDK y APIs de Gradle obsoletas de cara a Gradle 9.
