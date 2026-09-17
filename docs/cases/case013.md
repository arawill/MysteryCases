# Caso 013 — Vestuario vacío

## Temática

Tras el cierre del gimnasio, Inés aparece sin vida en el almacén. El plano separa una recepción compacta, una sala de máquinas abierta, los vestuarios, la zona de peso libre y el almacén.

## Plano y zonas

- **Recepción:** filas 1–2, columnas 1–2.
- **Sala de máquinas:** franja superior desde la columna 3, lateral derecho de las filas 3–4 y mitad derecha de las filas 5–6.
- **Vestuarios:** filas 3–4, columnas 1–2.
- **Peso libre:** filas 3–4, columnas 3–4.
- **Almacén:** filas 5–6, columnas 1–2.

Las cinco etiquetas de zona se anclan en casillas libres, sin objeto ni solución.

## Personas

| Persona | Papel | Posición canónica |
| --- | --- | --- |
| Violeta | Sospechosa | 1:3 |
| Pedro | Sospechoso | 2:6 |
| Lara | Sospechosa | 3:4 |
| Álex | Sospechoso | 4:5 |
| Darío | Sospechoso y asesino | 5:2 |
| Inés | Víctima | 6:1 |

## Objetos y footprints

- **Banco de gimnasio** (`gymBench`): ocupa 1:3–1:4; solo 1:3 es ocupable. La casilla 1:4 queda reservada y la imagen se dibuja una única vez sobre las dos celdas.
- **Cinta de correr** (`treadmill`): 3:5, bloqueante, perfil `tall`.
- **Taquillas** (`lockerBank`): 3:1, bloqueantes, perfil `tall`.
- **Mancuernas** (`dumbbells`): 4:4, bloqueantes, perfil `compact`.
- **Asientos de apoyo:** 2:6, 3:4, 4:5 y el taburete del almacén en 5:2 son ocupables.

## Pistas exactas

### Violeta

- Estaba sentada en el banco de gimnasio.
- Estaba en la sala de máquinas.

### Darío

- Estaba sentado en el taburete del almacén.
- Estaba en el almacén.

### Pedro

- Estaba sentado junto a las máquinas.
- Estaba al norte de Álex.

### Lara

- Estaba sentada en la zona de peso libre.
- Estaba junto a las mancuernas.

### Álex

- Estaba sentado junto a la cinta de correr.
- Estaba en la sala de máquinas.

### Inés

No tiene pistas. Su posición se obtiene por descarte.

## Deducción

1. El único lugar ocupable del banco de gimnasio es 1:3, así que Violeta queda allí.
2. El único asiento situado junto a las máquinas es 2:6; Pedro queda en esa celda.
3. En peso libre, el asiento de 3:4 es el único que queda junto a las mancuernas de 4:4: Lara ocupa 3:4.
4. Álex está en el asiento 4:5, junto a la cinta de correr y dentro de la sala de máquinas. La relación de Pedro al norte de Álex confirma el encadenamiento.
5. El taburete del almacén fija a Darío en 5:2.
6. Ya ocupadas las filas 1–5 y las columnas 2–6, la única fila y columna disponibles sitúan a Inés en 6:1.

Las anclas de objeto, junto con la regla de una persona por fila y columna, dejan exactamente una solución; el solver la verifica sin truncamiento y coincide con la solución canónica.

## Víctima y asesino

Inés queda en el almacén (6:1). Darío está en la otra y única posición ocupada de esa misma zona (5:2). Ninguna otra persona comparte el almacén, por lo que `findKiller()` identifica únicamente a Darío como asesino.
