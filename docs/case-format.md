# Formato serializable de casos

Los casos manuales migrados siguen este flujo:

```text
caseNNN.json → JSON Schema → loadSerializedCase() → validación semántica → GameCase
```

La UI, el solver y el resto del juego solo consumen `GameCase`; no dependen del formato de almacenamiento.

## Versión y fuente de verdad

La versión actual es `schemaVersion: 1`, centralizada en `CURRENT_CASE_SCHEMA_VERSION`. Solo se acepta esa versión.

`src/game/cases/schema/case.schema.json` es la fuente de verdad portable para productores externos y herramientas. `SerializedGameCase` es su espejo TypeScript para el código del juego. Los tests validan los JSON reales y ejercitan todas las variantes de pistas tipadas para detectar desincronizaciones. Un cambio incompatible deberá crear una nueva versión de schema, incrementar la constante y añadir dispatch o migración explícita en el loader.

## Ejemplo mínimo

```json
{
  "schemaVersion": 1,
  "id": "case999",
  "title": "Título",
  "intro": "Introducción",
  "difficulty": 1,
  "rows": 1,
  "columns": 1,
  "zones": [{ "id": "room", "name": "Sala", "tone": "cafe" }],
  "objects": [],
  "board": [{ "row": 1, "column": 1, "zoneId": "room", "occupiable": true }],
  "characters": [{ "id": "person", "name": "Persona", "avatar": "👤", "isVictim": true, "clues": [] }],
  "solution": [{ "characterId": "person", "position": { "row": 1, "column": 1 } }]
}
```

El ejemplo muestra la estructura mínima, pero las reglas actuales de gameplay pueden exigir más filas, personajes y una solución capaz de identificar un asesino.

## Responsabilidades de validación

JSON Schema Draft 2020-12 valida estructura, propiedades requeridas, tipos, enums, pistas discriminadas y campos opcionales. Las estructuras públicas usan `additionalProperties: false` para detectar typos y cambios no versionados.

El loader resuelve referencias y comprueba relaciones que el schema no puede conocer: claves de assets registradas, IDs duplicados, zonas y objetos existentes, límites dependientes del tamaño del tablero y personajes de la solución. Finalmente reutiliza `validateCaseDefinition` para las reglas del dominio.

## Assets

El JSON usa claves semánticas como `cafeteria.object.chair` o `avatar.avatar_08`, nunca imports ni rutas. `caseAssetRegistry.ts` es el único límite que traduce esas claves a assets administrados por el bundler. Toda clave nueva debe registrarse allí y cubrirse con tests.

## Añadir un caso manual

1. Crear `src/data/cases/json/caseNNN.json` conforme al schema y con `schemaVersion: 1`.
2. Registrar únicamente sus assets nuevos.
3. Mantener `caseNNN.ts` como export de compatibilidad que invoque `loadSerializedCase`.
4. Añadir tests de schema, equivalencia, solver y validator.

Mystery Cases Studio deberá exportar exactamente este formato JSON portable. No debe emitir imports, funciones, dependencias de React/Vite, rutas absolutas ni estado runtime.
