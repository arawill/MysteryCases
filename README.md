# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## PWA / Offline

## Despliegue web / GitHub Pages

La publicación esperada es <https://arawill.github.io/MysteryCases/>. El workflow `Deploy GitHub Pages` se ejecuta desde `main` y crea una build específica para el subpath del repositorio:

```bash
npm run build:pages
npm run verify:pages
```

`npm run build` sigue siendo la build local y de Capacitor, con base `/`; la build Pages usa `/MysteryCases/`.

## Android / Capacitor

El asset Android publicado en GitHub Releases debe llamarse exactamente `MysteryCases.apk`: la Home usa la URL estable `/releases/latest/download/MysteryCases.apk`.

Sincroniza el bundle web dentro del proyecto Android:

```bash
npm run android:sync
```

Para abrirlo en Android Studio:

```bash
npm run android:open
```

Para crear un APK debug de pruebas:

```bash
npm run android:build:debug
```

El APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Es un artefacto para pruebas o sideload; no es una release firmada para distribución pública.

### Release firmada manual

La candidata activa es `1.2.0`, con Android `versionName 1.2.0` y `versionCode 3`. La release `v1.1.0` y su evidencia se conservan como historial; no se debe reutilizar su identidad. Antes de cada publicación posterior, incrementa siempre `versionCode` y actualiza conjuntamente la versión canónica de `package.json` y `versionName`.

Genera una keystore local una sola vez (no se incluye en Git):

```bash
keytool -genkeypair -v -keystore android/keystore/mysterycases-release.jks -alias mysterycases -keyalg RSA -keysize 2048 -validity 10000
```

Copia `android/keystore.properties.example` como `android/keystore.properties` y rellena sus cuatro valores locales. La ruta `storeFile` es relativa a la carpeta `android`; el ejemplo apunta a `keystore/mysterycases-release.jks`. No compartas ni subas la keystore, las contraseñas ni `keystore.properties`.

Con la firma configurada, crea y prepara el artefacto de distribución:

```bash
npm run android:build:release
npm run verify:android:release
npm run android:prepare:release
```

`verify:android:release` es un gate estricto: exige firma verificable y herramientas Android locales, contrasta package, `versionName` y `versionCode`, y compara el inventario y SHA-256 de todos los assets empaquetados con los assets sincronizados, incluido exactamente el Worker actual. Un APK ausente, vacío, antiguo o distinto falla; la falta de `apksigner` también falla.

El APK firmado queda en `android/app/build/outputs/apk/release/app-release.apk`. La ruta oficial `android:prepare:release` ejecuta primero `android:sync`, por lo que reconstruye y sincroniza los assets web desde el código actual antes de invocar el gate; si ese paso falla, no verifica ni copia. Después comprueba que `release/MysteryCases.apk` sea byte a byte idéntico al APK verificado. Solo tras un resultado verde debe subirse manualmente con el nombre exacto `MysteryCases.apk`, para que funcione el enlace de descarga de la Home. La APK release firmada de `1.2.0`, la PWA instalada y Android WebView real siguen pendientes de validación; ningún build sustituye esas comprobaciones.

Desarrollo normal:

```bash
npm run dev
```

Para comprobar el build PWA y sus assets offline:

```bash
npm run verify:pwa
```

Para probar el service worker real, usa `npm run build` y después `npm run preview`. El service worker no se prueba correctamente solo con `npm run dev`.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
