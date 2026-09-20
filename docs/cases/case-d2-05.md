# D2/C05 — La unidad defectuosa

## Temática y plano

Una unidad recién ensamblada falló durante la inspección final. Raquel apareció sin vida entre los controles de la fábrica: reconstruye la escena y descubre quién saboteó la línea de producción.

El tablero es de 7 × 7 y tiene cuatro zonas continuas: **Montaje** (filas 1–3, columnas 1–3), **Calibración** (filas 1–3, columnas 4–7), **Repuestos** (filas 4–7, columnas 1–3) y **Control** (filas 4–7, columnas 4–7). Sus etiquetas están en (1,3), (2,4), (7,1) y (6,5), en celdas libres.

## Solución canónica

| Personaje | Posición | Zona |
| --- | --- | --- |
| Mario | (1,1) | Montaje |
| Laura | (2,6) | Calibración |
| Sergio | (3,5) | Calibración |
| Paula | (4,3) | Repuestos |
| Víctor | (5,4) | Control |
| Berta | (6,2) | Repuestos |
| Raquel, víctima | (7,7) | Control |

Víctor es el asesino: es la única persona que comparte Control con Raquel.

## Objetos y footprints

- **Cadena de montaje** (`assemblyLine`): (3,1)–(3,3), 1 × 3, bloqueante y renderizada una sola vez como superficie continua bajo los personajes.
- **Brazo robótico** (`roboticArm`): (2,2), bloqueante.
- **Cápsula de ensamblaje** (`androidPod`): (1,6), bloqueante.
- **Estación de calibración** (`calibrationStation`): (3,5)–(3,6), 1 × 2; solo (3,5) permite una persona.
- **Carro de repuestos** (`partsTrolley`): (5,2), bloqueante.

## Pistas exactas

### Mario

- Estaba en montaje.
- Estaba en una esquina de montaje.

### Laura

- Estaba en calibración.
- Estaba junto a la cápsula de ensamblaje.

### Sergio

- Estaba en calibración.
- Estaba en la misma columna que la estación de calibración.

### Paula

- Estaba en repuestos.
- Estaba al sureste del brazo robótico.
- Estaba dos filas al norte de Berta.

La tercera pista de Paula es la distancia mínima necesaria para mantener una deducción humana clara sin reemplazar las relaciones visuales por coordenadas directas.

### Víctor

- Estaba en la cuarta columna.
- Estaba al norte de Raquel.

### Berta

- Estaba junto al carro de repuestos.
- Estaba en la misma columna que el brazo robótico.

### Raquel

- Sin pistas propias.

## Deducción

Laura queda junto a la cápsula en (2,6) y Sergio en la columna de la estación, en (3,5). Berta, junto al carro y en la columna del brazo, queda en (6,2); Paula queda dos filas al norte, en (4,3), y su relación sureste con el brazo lo confirma. Las filas, columnas y objetos ya descartados dejan a Mario en (1,1). Víctor ocupa la cuarta columna al norte de Raquel, en (5,4), y la última posición libre es Raquel en (7,7). El solver confirma una única solución canónica sin truncamiento.
