# Footprints de objetos

Los objetos sin `footprint` mantienen el comportamiento histórico: ocupan una sola celda y usan `occupiable`.

Un objeto multicelda declara un `footprint` rectangular y continuo, con un identificador de instancia y sus coordenadas. Puede declarar `occupiablePositions` para indicar qué celdas del rectángulo aceptan una persona. El resto permanece reservado y bloqueado. La imagen se renderiza una sola vez desde la celda ancla y se ajusta a todo el rectángulo con `object-fit: contain`.

| Objeto | Footprint habitual | Posiciones ocupables |
| --- | --- | --- |
| Silla/butaca | 1×1 | 1 |
| Retrete | 1×1 | 1 si el caso lo permite |
| Taburete | 1×1 | 1 |
| Tumbona | 1×2 o 2×1 | normalmente 1 |
| Cama | 1×2 o 2×1 | una o ambas |
| Sofá | 1×2 o 2×1 | una o dos |
| Bañera | 1×2 o 2×1 | según el caso |
| Banco | 1×2 o 2×1 | una o dos |
| Mesa | variable | normalmente ninguna |

La tabla es una guía visual; cada caso declara explícitamente su semántica.
