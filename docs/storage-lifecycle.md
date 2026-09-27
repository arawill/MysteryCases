# Ciclo de vida del almacenamiento y reset

## Propiedad de claves

`src/game/persistence/storageCatalog.ts` es el catálogo ejecutable. Solo se borran claves que ese catálogo clasifica exactamente. No se usa `localStorage.clear()` ni un prefijo abierto.

| Familia | Reset explícito | Limpieza Daily automática |
| --- | --- | --- |
| `CaseSave V4` manual/procedural | Elimina | Solo Daily antiguo inaccesible |
| Progreso global y Normal | Elimina | Conserva |
| Sesiones/snapshots Daily e Infinite | Elimina | Daily completado, abandonado o inaccesible |
| Estadísticas Infinite | Elimina | Conserva |
| Historial y rachas derivadas | Elimina | Conserva |
| Logros | Elimina | Conserva |
| Journal y receipts de intento | Elimina | Solo receipts Daily antiguos inaccesibles |
| Preferencias (`mystery-cases-settings`) | Conserva | Conserva |
| Claves desconocidas | Conserva | Conserva |
| Cachés de generación/PWA | Reconstruibles; no son progreso | Fuera de alcance |

La pantalla Opciones promete borrar “todas las partidas, casos completados, estadísticas y desbloqueos”; por ello el reset también elimina historial/rachas y logros. Tema y autodesmarque se conservan. Futuras preferencias de idioma, sonido o accesibilidad deben vivir en la familia de preferencias y conservarse.

El reset retira primero cualquier journal para impedir que una recuperación posterior restaure progreso borrado. Después elimina y verifica cada destino, reintenta una vez un fallo transitorio, tolera ausencia/corrupción y devuelve las claves fallidas a la UI. Una segunda ejecución es inocua.

## Commit de una finalización

Cada cierre crea un journal V1 antes del primer cambio observable:

1. Recupera primero cualquier journal anterior.
2. Comprueba el receipt del intento (`caseId` + secuencia).
3. Calcula los valores finales en un `Storage` aislado.
4. Guarda `{saveVersion, id, kind, mutations[{key,before,after}]}` y verifica su lectura.
5. Verifica propiedad del journal antes de cada escritura y aplica valores finales.
6. Marca el receipt como completado dentro del mismo commit.
7. Elimina el journal solo después de verificar todo el estado final.

Una recuperación repite los valores `after`; no vuelve a calcular incrementos. Si falta cuota durante el roll-forward, intenta restaurar todos los valores `before`. Si tampoco puede revertir, conserva el journal. Repetir recuperación o cierre no duplica estadísticas, rachas, historial ni logros.

## Retención Daily

Se conservan el Daily de hoy y una única sesión anterior restaurable que siga activa. En un cambio de medianoche esa sesión anterior continúa visible, con opción explícita de abandonarla. Al completarla o abandonarla se eliminan su envelope/snapshot y `CaseSave`; sus estadísticas, racha, historial y logros permanecen salvo reset explícito.

La limpieza se ejecuta tras la inicialización, al confirmar una sesión, y tras completar/abandonar. Solo reconoce IDs Daily completos y válidos. Nunca borra la sesión activa, claves del día actual ni datos mientras una recuperación pendiente no haya podido resolverse.

## Versionado e inicialización

Se mantienen `CaseSave V4`, envelope V2, snapshot V1 y `g7`. Las sesiones legacy V1 se migran una vez a V2 antes de exponerse. El journal tiene versión propia V1 y los receipts de intento V1.

El orden efectivo es: recuperar transacción raw, migrar/restaurar sesiones conocidas, validar, determinar sesión activa, limpiar Daily y exponer UI. Recuperar primero conserva la capacidad de aplicar/revertir exactamente los bytes que originaron el journal.

Los errores de cuota y escritura no incluyen detalles técnicos en UI. El último `CaseSave` válido se restaura si falla un reemplazo y una finalización fallida conserva la partida para reintentar.
