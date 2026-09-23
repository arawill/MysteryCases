# Guía de autoría de casos normales JSON

Esta guía cubre los casos normales manuales de dificultad 1 almacenados en JSON. Daily, Infinite, generación procedural y los casos manuales D2 siguen flujos distintos y no deben migrarse con estas herramientas.

## Comandos

```powershell
# Crear un borrador aislado. Acepta 99 o case099.
npm run case:draft -- 99

# Validar un JSON concreto.
npm run case:validate -- drafts/cases/case099.json

# Validar todos los JSON publicados, su registro y disponibilidad.
npm run case:validate-all

# Validar además el catálogo Normal completo, incluida unicidad lógica.
npm run verify:normal-cases
```

Los comandos deben ejecutarse desde la raíz del repositorio. Las rutas se normalizan, se resuelven físicamente y se rechazan si salen del proyecto, incluso a través de enlaces simbólicos.

## 1. Iniciar un borrador

Ejemplo ficticio:

```powershell
npm run case:draft -- case099
```

El comando:

- acepta únicamente un número de 1 a 999 o un ID exacto `caseNNN`;
- rechaza IDs que ya existan en casos publicados o borradores;
- escribe con modo exclusivo y nunca sobrescribe;
- crea `drafts/cases/case099.json`, fuera de `src` y del registro de runtime;
- incluye `schemaVersion: 1`, los campos principales del contrato, `__draft` y marcadores `__TODO_…`;
- deja dimensiones y colecciones incompletas para que el archivo no pueda validarse ni publicarse accidentalmente.

La mera existencia de un archivo en `drafts/cases` nunca lo convierte en caso jugable. El runtime no escanea ese directorio.

## 2. Editar según el contrato

Consulta:

- `docs/case-format.md` para la arquitectura y el flujo de carga;
- `src/game/cases/schema/case.schema.json` para el contrato Draft 2020-12;
- un JSON publicado cercano solo como referencia estructural, nunca como fuente narrativa.

Completa el contenido sin cambiar `schemaVersion`. Antes de validar como candidato final:

1. Sustituye todos los valores `__TODO_…`.
2. Elimina la propiedad completa `__draft`.
3. Haz que `id` coincida exactamente con el nombre del archivo.
4. Completa tablero, personajes, pistas y solución conforme al schema y a las reglas de dominio.

No relajes el schema para acomodar el estado intermedio. El borrador puede ser inválido precisamente porque está aislado del runtime.

## 3. Añadir assets

Los JSON contienen claves semánticas, no imports ni rutas. Para cada asset nuevo:

1. Añade el archivo bajo `src/assets` en la categoría adecuada.
2. Impórtalo estáticamente en `src/game/cases/caseAssetRegistry.ts`.
3. Añade una clave única al objeto `caseAssetRegistry`.
4. Usa esa clave en `iconAsset` o `avatarAsset` del JSON.
5. Ejecuta la validación individual.

El validador muestra la ruta JSON exacta de cualquier clave ausente, por ejemplo `/objects/0/iconAsset`. No elimines assets basándote únicamente en búsquedas TypeScript: los JSON los consumen mediante el registro.

## 4. Validar un caso individual

```powershell
npm run case:validate -- drafts/cases/case099.json
```

La validación comprueba, en este orden:

1. que la ruta permanezca dentro del repositorio y sea un archivo `.json`;
2. JSON válido, con línea y columna cuando el parser las proporciona;
3. formato `caseNNN`, correspondencia ID/nombre y colisiones;
4. `schemaVersion` y JSON Schema Draft 2020-12 mediante el mismo Ajv de producción;
5. ausencia de `__draft` y marcadores `__TODO_…`;
6. claves de assets mediante `resolveCaseAsset`;
7. conversión mediante `loadSerializedCase`, que resuelve referencias, ejecuta las validaciones semánticas y llama a `validateCaseDefinition`.

Un error tiene este formato:

```text
archivo · /ruta/json · valor problemático: motivo [código]
```

Corrige primero los errores de JSON o schema; el loader solo puede comprobar relaciones internas cuando la estructura es válida.

## 5. Preparar la publicación

Un resultado «Caso válido» significa que el JSON puede convertirse a `GameCase`, no que ya esté publicado. La publicación siempre requiere cambios manuales revisables.

Los wrappers C01–C15 siguen siendo una API interna con consumidores directos. Evitarlos solo para casos nuevos crearía dos vías de registro y eliminarlos exigiría una refactorización amplia. Por tanto, se conserva el wrapper mínimo:

```ts
import serializedCaseNNN from './json/caseNNN.json'
import { loadSerializedCase } from '../../game/cases/loadSerializedCase'

export const caseNNN = loadSerializedCase(serializedCaseNNN)
```

Para publicar el siguiente número consecutivo:

1. Mueve el JSON terminado de `drafts/cases` a `src/data/cases/json`.
2. Crea `src/data/cases/caseNNN.ts` con el wrapper anterior.
3. Importa `caseNNN` en `src/data/cases/manualNormalCases.ts`.
4. Añade `['1:N', caseNNN]` al mapa, manteniendo el orden numérico.
5. Incrementa el recuento de dificultad 1 en `src/game/normal/availability.ts` solo si no quedan huecos.
6. Añade el caso a los tests de serialización y crea sus tests específicos de solver, solución, asesino y gameplay.
7. Añade una garantía de equivalencia adecuada si el caso procede de otra representación; para un caso nacido en JSON no inventes una «firma legacy».

No basta con mover un archivo a la carpeta de producción. `case:validate-all` detectará JSON sin registro, registros sin archivo, huecos, duplicados y desacuerdos con el runtime.

## 6. Validación global y pruebas

Durante la edición:

```powershell
npm run case:validate -- <ruta-json>
npx vitest run src/tools/__tests__/caseDraft.test.ts src/tools/__tests__/caseValidation.test.ts
```

Antes del commit:

```powershell
npm run case:validate-all
npm run verify:normal-cases
npx tsc -b
npm run lint
npm test
npm run verify:pwa
npm run verify:pages
git diff --check
```

`verify:normal-cases` ejecuta primero la validación global de los quince JSON de D1 y después verifica los 21 casos Normal actualmente publicados, incluidos los seis D2 TypeScript. La validación JSON no se añadió al build web: no es necesaria para empaquetar y ya forma parte del verificador de catálogo.

## Lista de comprobación previa al commit

- [ ] El borrador ya no contiene `__draft` ni `__TODO_…`.
- [ ] El archivo se llama exactamente igual que su `id` más `.json`.
- [ ] `schemaVersion` continúa siendo `1`.
- [ ] No se modificó contenido de otros casos.
- [ ] Todos los assets nuevos están registrados y se resuelven localmente.
- [ ] La solución satisface todas las pistas e identifica un único asesino.
- [ ] Existe wrapper y entrada en `manualNormalCases`.
- [ ] La disponibilidad solo se incrementó de forma consecutiva.
- [ ] Pasan la validación individual y la global.
- [ ] Pasan tests específicos, TypeScript, lint, suite completa y builds aplicables.
- [ ] El diff no contiene borradores ficticios, outputs generados ni cambios ajenos.

## Decisiones de implementación

- Ajv sigue siendo la fuente de errores estructurales. Solo se expusieron sus diagnósticos como ruta, valor y motivo.
- El loader de producción sigue siendo la autoridad para referencias, assets, transformación y reglas semánticas; no se duplicaron esas reglas en la herramienta.
- Lectura de archivos, seguridad de rutas, correspondencia ID/nombre, marcadores y colisiones son reglas de autoría porque no existen cuando el loader recibe un objeto en memoria.
- Los borradores usan metadatos fuera del schema y por eso viven fuera de `src`; el schema de producción no se modificó.
- Los wrappers se mantienen por compatibilidad y uniformidad. No hay publicación automática ni descubrimiento por glob.
