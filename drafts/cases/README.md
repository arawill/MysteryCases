# Borradores de casos

Este directorio está aislado del runtime. Los JSON que contiene no se publican ni se descubren automáticamente.

Créelos con `npm run case:draft -- <número|caseNNN>` y sigue `docs/case-authoring.md`. No muevas un borrador a `src/data/cases/json` hasta que `case:validate` lo acepte y hayas eliminado sus metadatos y marcadores pendientes.
