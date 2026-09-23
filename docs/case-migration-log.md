# Registro de migración de casos normales

Estado final: los quince casos manuales de dificultad 1 están almacenados como JSON con `schemaVersion: 1`. C01 y C02 establecieron el loader, el schema, el registro de assets y los wrappers de compatibilidad; C03–C15 se migraron después sobre el mismo contrato. La auditoría final y sus decisiones de conservación están en `case-architecture-consolidation-audit.md`.

## C01 — La última taza

- Migrado en la fase inicial y conservado como entrada directa de la ruta histórica y del generador Normal.
- La equivalencia completa se protege con un fixture TypeScript independiente, además de schema, solver y tests específicos.

## C02 — El marco vacío

- Migrado en la fase inicial y registrado como caso manual Normal `1:2`.
- La equivalencia completa se protege con un fixture TypeScript independiente, además de schema, solver y tests específicos.

## C03 — El salón en silencio

- Migrado a `schemaVersion: 1` sin cambios funcionales.
- Se preservaron la puerta exterior, el footprint horizontal del sofá y su única posición ocupable.
- Assets añadidos únicamente para sus objetos y avatares.
- La equivalencia se protege mediante la huella SHA-256 congelada del `GameCase` legacy, además de los tests específicos del caso.

## C04 — Turno de noche

- Migrado a `schemaVersion: 1` preservando las cuatro zonas hospitalarias.
- Se conservaron el footprint de la cama, su única celda ocupable y los objetos contextuales generados por helpers.
- Las propiedades legacy con valor `undefined` se consideran ausentes, que es su representación JSON equivalente.

## C05 — El último café

- Migrado a `schemaVersion: 1` manteniendo la redistribución temática de asientos y objetos.
- Se preservaron el mostrador bloqueante de dos celdas, ambos taburetes y las tres sillas diferenciadas por ID.

## C06 — Motor en frío

- Migrado a `schemaVersion: 1` conservando la geometría irregular de recepción, boxes, oficina y almacén.
- Se mantuvieron el banco de trabajo bloqueante de dos celdas y los cinco asientos temáticos con IDs propios.

## C07 — Horas extra

- Migrado a `schemaVersion: 1` manteniendo las cuatro áreas de la oficina y la distribución legacy completa.
- Se preservaron el footprint bloqueante de la mesa de reuniones, las taquillas y los cinco asientos diferenciados por ID.

## C08 — Piscina cerrada

- Migrado a `schemaVersion: 1` conservando la piscina como un único footprint visual bloqueante de 2×3.
- Se mantuvieron la posición ocupable explícita de la silla del socorrista, las cinco zonas y la solución canónica.

## C09 — Pasillo 24

- Migrado a `schemaVersion: 1` preservando las cinco áreas del supermercado y sus cuatro asientos diferenciados.
- Se conservaron el carrito ocupable con posición explícita y el congelador horizontal bloqueante de dos celdas.

## C10 — Última función

- Migrado a `schemaVersion: 1` manteniendo el mural de pantalla como feature de borde y no como objeto del tablero.
- Se preservó la fila de butacas de dos celdas con una única posición ocupable, además de las pistas que impiden el intercambio en el pasillo.

## C11 — Silencio, por favor

- Migrado a `schemaVersion: 1` conservando la mesa de lectura bloqueante, las dos estanterías distintas y los cinco asientos propios.
- Se mantuvieron sin cambios las referencias espaciales de Mónica y Sofía que hacen única la solución.

## C12 — El último andén

- Migrado a `schemaVersion: 1` conservando las cinco zonas de la estación y los cuatro asientos diferenciados.
- Se preservaron el mostrador de billetes bloqueante de dos celdas, la máquina expendedora y la posición ocupable explícita del banco.

## C13 — Vestuario vacío

- Migrado a `schemaVersion: 1` manteniendo la geometría irregular de las cinco zonas y el equipamiento temático del gimnasio.
- Se preservaron el banco de dos celdas con una única plaza ocupable y las pistas espaciales no redundantes de la solución canónica.

## C14 — Después del cierre

- Migrado a `schemaVersion: 1` conservando las vitrinas y la mesa de restauración como footprints bloqueantes independientes.
- Los dos cuadros siguen siendo features exteriores sin efecto sobre la ocupación; las pistas no redundantes y la solución permanecen idénticas.

## C15 — Ensayo general

- Migrado a `schemaVersion: 1` conservando los tres footprints teatrales y sus posiciones ocupables explícitas.
- La cortina permanece como feature de borde; el perchero y el foco siguen siendo decoraciones bloqueantes sin alterar pistas ni solución.
