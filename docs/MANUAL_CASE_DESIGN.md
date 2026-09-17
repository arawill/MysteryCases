# Diseño manual de casos

La campaña Normal contiene 75 expedientes: 15 por cada una de las cinco dificultades. Los casos oficiales se diseñan y revisan manualmente; un generador puede servir como borrador, nunca como sustituto de esa revisión.

## Contrato narrativo

La víctima conserva `clues: []`: es seleccionable, colocable, movible y retirable como cualquier personaje. Su posición se deduce por descarte, filas y columnas. El asesino es la única persona que comparte zona con la víctima. La frase de presentación sobre la última casilla libre nunca es una restricción del solver.

## Proceso

1. Diseña la solución y la pareja víctima/asesino.
2. Construye tablero, zonas, objetos y elementos de borde.
3. Escribe una cadena humana de deducciones, no solo coordenadas.
4. Reserva la víctima para el descarte final.
5. Comprueba unicidad con el solver.
6. Revisa manualmente que cada paso pueda explicarse.

## Vocabulario

Prioriza habitaciones, objetos, relaciones entre personas, paredes, esquinas, ventanas, puertas y suelos. Están disponibles relaciones de zona, ocupación exacta de zona/objeto/suelo, alineación vertical con objetos, diagonales amplias respecto a objetos y superficies. Evita coordenadas directas salvo anclas iniciales necesarias.

Patrones útiles: grupos en una habitación con pistas individuales, objetos bloqueantes frente a soportes ocupables, exclusiones, esquinas de zona, alineación con objetos, ventanas y cadenas norte/sur. No copies tableros, textos, personajes ni soluciones de libros o casos de referencia.

## Progresión

- D1: anclas claras de objetos y zonas; cadenas cortas.
- D2: esquinas, paredes, exclusiones y relaciones simples.
- D3: habitaciones irregulares, grupos y ocupación exacta.
- D4: ventanas, puertas, alineación y diagonales respecto a objetos.
- D5: cadenas largas, suelos, traits y restricciones combinadas.

## Lista de comprobación

- Solución única y canónica coincidente.
- Una sola víctima, sin pistas lógicas.
- Asesino único por compartir zona con la víctima.
- Filas, columnas, zonas, objetos y bordes coherentes.
- Cada pista es verdadera y aporta una deducción explicable.
- No hay copia literal de material externo.
