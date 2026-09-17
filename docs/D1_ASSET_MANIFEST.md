# Manifiesto de assets D1 — Casos 04 a 15

## Estado técnico actual

`BoardObject` ya admite `appearance`, `visualProfile`, `footprint` rectangular y `occupiablePositions`. Los objetos sin footprint continúan usando una celda y su booleano `occupiable`. El catálogo contextual actual declara ocho apariencias; usa PNG con canal alfa, escala normalizada entre 0.5 y 1.2 y no declara offsets todavía.

| Clave actual | Archivo | Formato / dimensiones / disco | Perfil recomendado | Escala actual | Offset actual | Footprint habitual | Ocupación habitual | Reutilización D1 | Riesgo visual |
| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| `sunLounger` | `src/assets/objects/contextual/tumbona.png` | PNG RGBA, 580×962, 719 KB | tall | 1.00 | 0,0 | 1×2 o 2×1 | explícita | Ninguna prevista | Vertical; no estirar a 1×1 |
| `toilet` | `src/assets/objects/contextual/retrete.png` | PNG RGBA, 568×1012, 561 KB | tall | 0.90 | 0,0 | 1×1 | según caso | Ninguna prevista | Muy vertical |
| `diningChair` | `src/assets/objects/contextual/silla_comedor.png` | PNG RGBA, 523×919, 547 KB | standard | 0.92 | 0,0 | 1×1 | sí | C05, C11 | Márgenes ajustados por escala |
| `officeChair` | `src/assets/objects/contextual/silla_oficina.png` | PNG RGBA, 747×1128, 865 KB | tall | 1.10 | 0,0 | 1×1 | sí | C07 | Puede dominar la celda |
| `sofa` | `src/assets/objects/contextual/sofa.png` | PNG RGBA, 898×612, 644 KB | wide | 1.00 | 0,0 | 1×2 | explícita | Referencia para C04–C15 | Horizontal; anclar una vez |
| `bathtub` | `src/assets/objects/contextual/banera.png` | PNG RGBA, 642×809, 552 KB | tall | 0.94 | 0,0 | 1×2 | explícita | Ninguna prevista | Sin uso D1 |
| `outdoorBench` | `src/assets/objects/contextual/banco_exterior.png` | PNG RGBA, 1053×868, 943 KB | wide | 1.00 | 0,0 | 1×2 | explícita | C08, C12 | Requiere contención en 1×2 |
| `stool` | `src/assets/objects/contextual/taburete.png` | PNG RGBA, 518×874, 489 KB | tall | 0.70 | 0,0 | 1×1 | sí | C05 | Escala reducida ya aprobada |

Los PNG de escenarios también usan `Format32bppArgb` (canal alfa) y tamaños de 240–402 px aproximadamente, salvo los assets históricos de cafetería, que son 1254×1254 px. Su perfil, escala, footprint y ocupación se decidirán por instancia de caso hasta que se incorporen al catálogo.

| Recurso legacy reutilizado | Archivo | Formato / dimensiones / disco | Perfil inicial recomendado | Escala / offset actual | Footprint / ocupación recomendada | Casos | Cautela |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cama hospitalaria | `src/assets/scenarios/hospital/objects/hospital_bed.png` | PNG RGBA, 297×355, 104 KB | tall | sin catálogo; 0,0 | 1×2; una explícita | C04 | Arte vertical para footprint vertical |
| Carrito médico | `src/assets/scenarios/hospital/objects/medical_cart.png` | PNG RGBA, 275×357, 96 KB | tall | sin catálogo; 0,0 | 1×1; bloqueante | C04 | Mantener margen superior |
| Escritorio | `src/assets/scenarios/office/objects/desk.png` | PNG RGBA, 340×355, 100 KB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C04, C06, C07, C10 | No usar estirado como mesa larga |
| Caja de herramientas | `src/assets/scenarios/outdoor/objects/toolbox.png` | PNG RGBA, 374×373, 60 KB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C06 | Reutilización mecánica natural |
| Impresora | `src/assets/scenarios/office/objects/printer.png` | PNG RGBA, 246×351, 66 KB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C07 | Contenido vertical compacto |
| Archivador | `src/assets/scenarios/office/objects/filing_cabinet.png` | PNG RGBA, 240×342, 61 KB | tall | sin catálogo; 0,0 | 1×1; bloqueante | C07 | No confundir con taquilla |
| Estantería | `src/assets/scenarios/office/objects/bookshelf.png` | PNG RGBA, 330×355, 106 KB | tall | sin catálogo; 0,0 | 1×1; bloqueante | C09, C11 | Variante 1×2 sólo con arte dedicado |
| Caja registradora | `src/assets/scenarios/cafeteria/objects/register.png` | PNG RGBA, 1254×1254, 1.06 MB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C09 | Asset pesado; no duplicar innecesariamente |
| Lámpara de mesa | `src/assets/scenarios/hotel/objects/table_lamp.png` | PNG RGBA, 351×358, 73 KB | compact | sin catálogo; 0,0 | 1×1; bloqueante | C11 | No sustituye un foco de teatro |
| Maleta | `src/assets/scenarios/hotel/objects/suitcase.png` | PNG RGBA, 335×378, 79 KB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C12 | Adecuada como ancla de pista |
| Estatua | `src/assets/scenarios/hotel/objects/statue.png` | PNG RGBA, 369×378, 76 KB | tall | sin catálogo; 0,0 | 1×1; bloqueante | C14 | Pedestal legible a escala pequeña |
| Caja / baúl | `src/assets/scenarios/cafeteria/objects/crate.png` | PNG RGBA, 1254×1254, 1.12 MB | standard | sin catálogo; 0,0 | 1×1; bloqueante | C15 | Etiqueta narrativa de baúl; asset pesado |

## Recursos previstos por caso

| Caso | Recurso | Estado | Clave existente o propuesta | Archivo existente o propuesto | Orientación | Footprint / ocupación | Perfil / escala inicial | Notas |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 04 | Cama hospitalaria | EXISTING_READY | legacy `hospitalBed` | `src/assets/scenarios/hospital/objects/hospital_bed.png` | vertical | 1×2; una posición explícita | tall / 0.92 | Bloqueante salvo el lado de la almohada |
| 04 | Silla de ruedas | MISSING | `wheelchair` | `wheelchair.png` | cuadrada | 1×1; ocupable | standard / 0.92 | No sustituir por silla normal |
| 04 | Carrito médico | EXISTING_READY | legacy `medicalCart` | `src/assets/scenarios/hospital/objects/medical_cart.png` | vertical | 1×1; bloqueante | tall / 0.88 | Buen apoyo para pistas |
| 04 | Escritorio | EXISTING_READY | legacy `desk` | `src/assets/scenarios/office/objects/desk.png` | cuadrada | 1×1; bloqueante | standard / 0.90 | Reutilización clínica discreta |
| 05 | Barra | EXISTING_NEEDS_VARIANT | `cafeCounter` | `cafe_counter.png` | horizontal | 1×2; bloqueante | wide / 0.96 | Mostrador inequívoco |
| 05 | Cafetera | MISSING | `coffeeMachine` | `coffee_machine.png` | vertical | 1×1; bloqueante | standard / 0.84 | No confundir con caja registradora |
| 05 | Mesa redonda | EXISTING_NEEDS_VARIANT | `roundTable` | `round_table.png` | cuadrada | 1×1; bloqueante | standard / 0.90 | La mesa legacy no comunica forma redonda |
| 05 | Taburete | EXISTING_READY | `stool` | `src/assets/objects/contextual/taburete.png` | vertical | 1×1; ocupable | tall / 0.70 | Ya catalogado |
| 05 | Silla | EXISTING_READY | `diningChair` | `src/assets/objects/contextual/silla_comedor.png` | vertical | 1×1; ocupable | standard / 0.92 | Ya catalogada |
| 06 | Banco de trabajo | EXISTING_NEEDS_VARIANT | `workbench` | `workbench.png` | horizontal | 1×2; bloqueante | wide / 0.96 | El escritorio no es un banco mecánico |
| 06 | Caja de herramientas | EXISTING_READY | legacy `toolbox` | `src/assets/scenarios/outdoor/objects/toolbox.png` | cuadrada | 1×1; bloqueante | standard / 0.86 | Reutilización coherente |
| 06 | Neumáticos | MISSING | `tires` | `tires.png` | cuadrada | 1×1; bloqueante | standard / 0.88 | Grupo de dos o tres ruedas |
| 06 | Escritorio | EXISTING_READY | legacy `desk` | `src/assets/scenarios/office/objects/desk.png` | cuadrada | 1×1; bloqueante | standard / 0.90 | Oficina del taller |
| 07 | Escritorio | EXISTING_READY | legacy `desk` | `src/assets/scenarios/office/objects/desk.png` | cuadrada | 1×1; bloqueante | standard / 0.90 | Asset de oficina directo |
| 07 | Impresora | EXISTING_READY | legacy `printer` | `src/assets/scenarios/office/objects/printer.png` | vertical | 1×1; bloqueante | standard / 0.84 | Directo |
| 07 | Archivador | EXISTING_READY | legacy `filingCabinet` | `src/assets/scenarios/office/objects/filing_cabinet.png` | vertical | 1×1; bloqueante | tall / 0.88 | Directo |
| 07 | Silla de oficina | EXISTING_READY | `officeChair` | `src/assets/objects/contextual/silla_oficina.png` | vertical | 1×1; ocupable | tall / 1.10 | Revisar tamaño en móvil |
| 07 | Mesa de reuniones | EXISTING_NEEDS_VARIANT | `meetingTable` | `meeting_table.png` | horizontal | 1×2; bloqueante | wide / 0.94 | No estirar el escritorio |
| 08 | Piscina | CODE_NATIVE | `poolSurface` | sin PNG | footprint grande | 2×3; ninguna posición ocupable | suelo / n.a. | Seis celdas bloqueadas, una decoración continua |
| 08 | Banco | EXISTING_READY | `outdoorBench` | `src/assets/objects/contextual/banco_exterior.png` | horizontal | 1×2; una o dos explícitas | wide / 1.00 | Gradas o pasarela |
| 08 | Taquillas | MISSING | `lockerBank` | `locker_bank.png` | vertical | 1×1; bloqueante | tall / 0.92 | Reutilizable en C13 |
| 08 | Silla de socorrista | EXISTING_NEEDS_VARIANT | `lifeguardChair` | `lifeguard_chair.png` | vertical | 1×1; ocupable | tall / 0.86 | Un taburete no comunica el rol |
| 09 | Estantería | EXISTING_READY | legacy `bookshelf` | `src/assets/scenarios/office/objects/bookshelf.png` | vertical | 1×2; bloqueante | tall / 0.92 | Instancia horizontal sólo con arte futuro si hiciera falta |
| 09 | Caja registradora | EXISTING_READY | legacy `register` | `src/assets/scenarios/cafeteria/objects/register.png` | cuadrada | 1×1; bloqueante | standard / 0.78 | Directa |
| 09 | Congelador | MISSING | `freezer` | `freezer.png` | horizontal | 1×2; bloqueante | wide / 0.94 | Debe leerse como congelador |
| 09 | Carro de compra | EXISTING_NEEDS_VARIANT | `shoppingCart` | `shopping_cart.png` | cuadrada | 1×1; ocupable | standard / 0.88 | El carro de equipaje no es equivalente |
| 10 | Fila de butacas | EXISTING_NEEDS_VARIANT | `cinemaSeatRow` | `cinema_seat_row.png` | horizontal | 1×2; una o dos explícitas | wide / 0.96 | Se reutiliza en C15 |
| 10 | Proyector | MISSING | `projector` | `projector.png` | cuadrada | 1×1; bloqueante | standard / 0.86 | Objeto de cabina |
| 10 | Pantalla | CODE_NATIVE | `cinemaScreenWall` | sin PNG | pared | borde de zona; no ocupable | borde / n.a. | Elemento mural no interactivo |
| 10 | Mostrador | EXISTING_READY | legacy `desk` | `src/assets/scenarios/office/objects/desk.png` | cuadrada | 1×1; bloqueante | standard / 0.90 | Taquilla o concesiones |
| 11 | Mesa de lectura | EXISTING_NEEDS_VARIANT | `readingTable` | `reading_table.png` | horizontal | 1×2; bloqueante | wide / 0.94 | No deformar mesa cuadrada existente |
| 11 | Estantería | EXISTING_READY | legacy `bookshelf` | `src/assets/scenarios/office/objects/bookshelf.png` | vertical | 1×1; bloqueante | tall / 0.92 | Directa |
| 11 | Lámpara | EXISTING_READY | legacy `tableLamp` | `src/assets/scenarios/hotel/objects/table_lamp.png` | vertical | 1×1; bloqueante | compact / 0.82 | Directa |
| 11 | Silla | EXISTING_READY | `diningChair` | `src/assets/objects/contextual/silla_comedor.png` | vertical | 1×1; ocupable | standard / 0.92 | Directa |
| 12 | Banco | EXISTING_READY | `outdoorBench` | `src/assets/objects/contextual/banco_exterior.png` | horizontal | 1×2; una o dos explícitas | wide / 1.00 | Andén o espera |
| 12 | Máquina expendedora | MISSING | `vendingMachine` | `vending_machine.png` | vertical | 1×1; bloqueante | tall / 0.92 | Sin sustituto visual coherente |
| 12 | Maleta | EXISTING_READY | legacy `suitcase` | `src/assets/scenarios/hotel/objects/suitcase.png` | vertical | 1×1; bloqueante | standard / 0.84 | Directa |
| 12 | Mostrador de taquilla | EXISTING_NEEDS_VARIANT | `ticketCounter` | `ticket_counter.png` | horizontal | 1×2; bloqueante | wide / 0.94 | Variante de mostrador |
| 13 | Banco de gimnasio | EXISTING_NEEDS_VARIANT | `gymBench` | `gym_bench.png` | horizontal | 1×2; una explícita | wide / 0.92 | Banco exterior no es adecuado |
| 13 | Cinta de correr | MISSING | `treadmill` | `treadmill.png` | vertical | 1×1; bloqueante | tall / 0.92 | Equipo reconocible |
| 13 | Pesas | MISSING | `dumbbells` | `dumbbells.png` | cuadrada | 1×1; bloqueante | compact / 0.82 | No ocupar toda la celda |
| 13 | Taquillas | NOT_NEEDED | reutiliza `lockerBank` | `locker_bank.png` | vertical | 1×1; bloqueante | tall / 0.92 | Se genera una vez para C08 |
| 14 | Vitrina | MISSING | `displayCase` | `display_case.png` | horizontal | 1×2; bloqueante | wide / 0.94 | Debe tener cristal legible |
| 14 | Estatua | EXISTING_READY | legacy `statue` | `src/assets/scenarios/hotel/objects/statue.png` | vertical | 1×1; bloqueante | tall / 0.90 | Reutilización museística válida |
| 14 | Cuadro | CODE_NATIVE | `museumPaintingWall` | sin PNG | pared | decoración de borde | borde / n.a. | Marco CSS o decoración mural |
| 14 | Mesa de restauración | EXISTING_NEEDS_VARIANT | `restorationTable` | `restoration_table.png` | horizontal | 1×2; bloqueante | wide / 0.94 | La mesa auxiliar es demasiado pequeña |
| 15 | Piano | MISSING | `piano` | `piano.png` | horizontal | 1×2; una explícita | wide / 0.96 | Objeto principal de escenario |
| 15 | Tocador | EXISTING_NEEDS_VARIANT | `dressingTable` | `dressing_table.png` | horizontal | 1×2; bloqueante | wide / 0.92 | Variante de mesa con espejo |
| 15 | Fila de butacas | NOT_NEEDED | reutiliza `cinemaSeatRow` | `cinema_seat_row.png` | horizontal | 1×2; una o dos explícitas | wide / 0.96 | Asset único compartido con C10 |
| 15 | Perchero | MISSING | `coatRack` | `coat_rack.png` | vertical | 1×1; bloqueante | tall / 0.88 | Camerino |
| 15 | Foco | MISSING | `stageSpotlight` | `stage_spotlight.png` | vertical | 1×1; bloqueante | compact / 0.82 | No confundir con lámpara de mesa |
| 15 | Baúl | EXISTING_READY | legacy `crate` | `src/assets/scenarios/cafeteria/objects/crate.png` | cuadrada | 1×1; bloqueante | standard / 0.84 | Baúl de atrezzo con etiqueta narrativa |

## Resumen

- Recursos reutilizables directamente: **22**.
- Recursos que necesitan variante contextual: **12**.
- Recursos ausentes: **13**.
- Elementos recomendados como código nativo o borde: **3** (piscina, pantalla, cuadro).
- Recursos descartados por redundancia: **2** (taquillas de C13 reutilizan las de C08; butacas de C15 reutilizan las de C10).
- Imágenes nuevas reales a producir: **25**.

## Lista definitiva de imágenes nuevas

`wheelchair.png`, `cafe_counter.png`, `coffee_machine.png`, `round_table.png`, `workbench.png`, `tires.png`, `meeting_table.png`, `locker_bank.png`, `lifeguard_chair.png`, `shopping_cart.png`, `cinema_seat_row.png`, `projector.png`, `reading_table.png`, `vending_machine.png`, `ticket_counter.png`, `gym_bench.png`, `treadmill.png`, `dumbbells.png`, `display_case.png`, `restoration_table.png`, `piano.png`, `dressing_table.png`, `coat_rack.png`, `stage_spotlight.png`, `freezer.png`.

## Duplicados, sin uso y cautelas

- Hay dos familias de sofá, planta, silla y lámpara: contextual y por packs. No son duplicados intercambiables; el contexto visual decide cuál usar.
- `banera.png` y `retrete.png` están catalogados pero no están previstos en C04–C15.
- Los assets legacy de cafetería son mucho más pesados (aprox. 0.4–1.1 MB) que los packs de escenario. Deben reutilizarse con moderación para no aumentar el precache sin necesidad.
- Las imágenes propuestas no deben añadirse al catálogo ni al código hasta la fase de implementación de cada caso.
