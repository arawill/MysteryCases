# Auditoría de limpieza técnica

Fecha: 22 de septiembre de 2026.

## Alcance y garantías

La auditoría recorrió la aplicación, tests, herramientas, scripts, dependencias,
assets, PWA, GitHub Pages y Android. Se separaron tres grafos de consumidores:
runtime (`src/main.tsx`), tests y herramientas ejecutables desde `package.json`.

Se conservaron C01/C02 en JSON, su JSON Schema, el loader versionado y sus
fixtures de compatibilidad. No se creó ni migró C03.

## Limpieza aplicada

### Código y módulos sin consumidores

- `src/components/CaseCard.tsx`: componente sustituido, sin imports ni ruta.
- `src/data/cases/d1ManualCaseFactory.ts`: fábrica abandonada, sin consumidores.
- `src/game/characters/selector.ts`: fachada de compatibilidad sin consumidores.
- `src/tools/auditVictimBatch.ts`: herramienta puntual sin script ni documentación.
- `src/game/daily/characters.ts`: fachada usada solo por su propio test; el test
  comprueba ahora directamente el roster compartido que usa Daily en producción.
- `src/game/generation/scenario/profile.ts`: conversor usado solo por tests;
  reubicado como `src/game/__tests__/scenarioProfile.testUtils.ts`.

También se eliminaron siete helpers cuyo único resultado de búsqueda era su
propia declaración: `buildAchievementContext`, `getAchievementDefinition`,
`hasViolatedClue`, `hasRowAndColumn`, `pick`,
`isActiveNormalCaseNumber` y `getFrozenNormalCaseId`.

### Assets sin consumidores

- `src/assets/hero.png`.
- `public/icons.svg`.
- Dos notas iniciales del catálogo de avatares.
- Los seis manifiestos preliminares de packs de escenarios.

Todos tenían cero referencias. Las notas ya estaban materializadas en los
catálogos, assets y reportes de extracción actuales.

### Dependencias

- Eliminado `@capacitor/assets`: no tenía import, script ni configuración; la
  generación PWA usa `@vite-pwa/assets-generator`.
- Movido `@capacitor/cli` de dependencia de runtime a `devDependency`.
- Regenerado `package-lock.json` y podado `node_modules`: 118 paquetes
  transitivos eliminados.
- `npm audit`: 0 vulnerabilidades.

## Elementos conservados deliberadamente

- `art-source/` y `scripts/extract-art-sheets.py`: fuentes y pipeline reproducible
  de los assets actuales.
- `art-source/normal-cases-report.json`: salida de auditoría producida junto al
  catálogo congelado por `freeze:normal-cases`.
- `src/game/normal/signatures.ts`: solo lo usa tooling, pero es consumidor real
  de `freeze:normal-cases`.
- Tipos exportados del modelo y del formato serializado: forman parte del contrato
  de casos y deben mantenerse durante futuras migraciones.
- Tests plantilla de Android: Gradle los descubre; son de bajo valor, pero no son
  técnicamente archivos sin consumidor.
- `exports/d1_assets_reference.zip` (48,379,744 bytes): no tiene referencias en
  código ni documentación, pero parece un entregable de referencia intencional.
  No se borra sin una decisión explícita sobre conservación de entregables.
- `dist/`, `release/`, `artifacts/` y outputs de `android/app/build`: están
  ignorados y son locales/generados. No se mezclan con la limpieza versionada
  para evitar eliminar APKs o entregables que puedan ser útiles.

## Hallazgos no eliminables

El bundle importa assets que sí tienen consumidores reales. La PWA precachea 225
entradas y aproximadamente 112,816 KiB; el chunk principal ronda 4.08 MB antes de
gzip. Esto es un problema de carga/segmentación y optimización de imágenes, no
código muerto. Debe tratarse como una fase separada para no confundir optimización
con eliminación segura.

Gradle avisa de APIs obsoletas de cara a Gradle 9 y de una diferencia entre la
versión de las herramientas SDK y el XML del SDK instalado. El APK debug se
ensambla correctamente, por lo que no se cambió configuración nativa en esta
limpieza.

## Validación final

- TypeScript: correcto.
- Oxlint: correcto.
- Vitest: 78 archivos y 504 tests correctos.
- Build web y PWA: correctos.
- Build GitHub Pages: correcto.
- PWA y Pages: verificadores correctos.
- Catálogo Normal publicado: 21 casos correctos.
- Calidad procedural: 250 puzzles D1-D5 correctos.
- Capacitor Android: sincronización y verificador correctos.
- Gradle `assembleDebug`: correcto, 93 tareas.
- Grafo final: 0 módulos huérfanos, 0 módulos solo-test en producción y 0 assets
  de `src/assets` sin consumidor.
