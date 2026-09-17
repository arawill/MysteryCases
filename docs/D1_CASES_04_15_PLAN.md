# Plan D1 — Casos 04 a 15

## Reglas comunes

- Todos los casos son tableros 6×6 con seis personas, una víctima sin pistas y cinco sospechosos.
- Cada solución usará una fila y una columna por persona; la víctima se obtendrá por descarte y el asesino será la única otra persona de su zona.
- D1 prioriza anclas de objetos, zonas continuas, una cadena corta de filas/columnas ya ocupadas y como máximo una pista directa de fila o columna.
- Cada plano tendrá de tres a cuatro zonas continuas, `labelAnchor` libre de objetos y solución, y al menos un footprint multicelda con ocupación explícita cuando tenga sentido.
- Los elementos puramente murales no se forzarán dentro de una celda: se representarán como borde o decoración no interactiva.

| Caso | Título | Escenario | Zonas previstas | Mecánica principal | Objeto multicelda | Víctima provisional | Asesino provisional |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 04 | Turno de noche | Hospital | Recepción, sala de exploración, habitaciones, laboratorio | Cama ocupable y carrito médico para encadenar una ubicación | Cama hospitalaria 1×2 | Irene | Sergio |
| 05 | El último café | Cafetería | Barra, sala, cocina, almacén | Relación entre barra, cafetera y asiento | Barra 1×2 | Nadia | Álvaro |
| 06 | Motor en frío | Taller mecánico | Recepción, boxes, almacén, oficina | Banco de trabajo y caja de herramientas delimitan columnas | Banco de trabajo 1×2 | Carla | Iván |
| 07 | Horas extra | Oficina | Recepción, despachos, archivo, sala de reuniones | Escritorio, archivador e impresora crean una cadena de soporte | Mesa de reuniones 1×2 | Julia | Marcos |
| 08 | Piscina cerrada | Piscina pública | Vestuarios, pasarela, gradas, recepción | Banco y taquillas alrededor de una zona de agua no transitable | Piscina 2×3 de terreno bloqueado | Vera | Pablo |
| 09 | Pasillo 24 | Supermercado | Entrada, pasillos, cajas, almacén | Estantería y caja registradora alinean las posiciones | Estantería 1×2 | Marta | Diego |
| 10 | Última función | Cine | Vestíbulo, sala, cabina, pasillo | Butacas y proyector; la pantalla vive en la pared | Fila de butacas 1×2 | Elisa | Tomás |
| 11 | Silencio, por favor | Biblioteca | Acceso, lectura, estanterías, archivo | Mesa de lectura, lámpara y estantería forman deducciones cortas | Mesa de lectura 1×2 | Lucía | Raúl |
| 12 | El último andén | Estación | Vestíbulo, andén, taquillas, sala de espera | Banco, maleta y máquina expendedora delimitan la espera | Banco 1×2 | Elena | Bruno |
| 13 | Vestuario vacío | Gimnasio | Recepción, sala de máquinas, vestuarios, almacén | Banco de gimnasio y taquillas separan apoyos y bloqueos | Banco de gimnasio 1×2 | Inés | Darío |
| 14 | Después del cierre | Museo | Vestíbulo, galería, restauración, almacén | Vitrina, estatua y mesa de restauración sin revelar la galería final | Vitrina 1×2 | Noa | Héctor |
| 15 | Ensayo general | Teatro | Patio de butacas, escenario, camerino, almacén | Piano, tocador y foco encadenan la última deducción D1 | Piano 1×2 | Clara | Mateo |

## Progresión dentro de D1

1. C04–C06 introducen soportes claros y objetos bloqueantes con una única relación espacial sencilla.
2. C07–C10 alternan oficinas, exterior contenido, supermercado y cine para evitar repetir el mismo plano o combinación de pistas.
3. C11–C15 mantienen pistas accesibles, pero aumentan gradualmente el número de dependencias entre objeto, zona y columnas ya ocupadas.
4. Ningún caso usa a la víctima como objetivo de una pista ni revela al asesino antes de completar el plano.

## Decisiones de representación

- Piscina: terreno continuo bloqueante 2×3, no personaje colocable ni PNG repetido por celda. El plano declarará las seis celdas `occupiable: false`; una decoración de suelo única podrá dibujarse desde la futura capa de escenario sin excepción del solver.
- Pantalla de cine: elemento de borde/decoración mural, no un objeto de celda. El proyector sí será un objeto normal.
- Cuadros de museo: decoración mural o edge feature no interactivo; no afectan pistas, ocupación ni solver.
- Barras, mostradores y pantallas deben respetar los límites de zona. Un footprint sólo se usará dentro de una única habitación.

## Estado de esta planificación

Estos títulos, víctimas, asesinos y mecánicas son provisionales de diseño. No se han generado casos ni se ha modificado la campaña activa en esta auditoría.
