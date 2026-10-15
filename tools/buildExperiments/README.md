# TypeScript compilation options for Rspack

## Recommendation

Choose **B: `tsc --noEmit` for type checking and Rspack/SWC for compilation and bundling**. The representative builds were effectively tied for duration. B keeps the bundler on original TypeScript sources, produced source maps that point to those sources, and applied the current Browserslist targets with usage-based `core-js`. A needs extra handling for browser targets, polyfills, source-map chaining, emitted JSON and path aliases. The prototypes did not replace the production Webpack build.

## Current build and runtime contract

Webpack has three entries: the main app, authentication and browser checking. `babel-loader` transforms the webapp script source with TypeScript stripping, automatic Emotion JSX, legacy decorators, `preset-env`, and `core-js` usage injection. `tsconfig.type-check.json` is a separate no-emit check; the production Webpack target does not emit webapp JavaScript with `tsc`. Nx builds workspace libraries with `tsc` into CommonJS `lib/` outputs. Webpack resolves those package outputs. Jest continues to use its current `babel-jest` setup.

The artifact validator in [webappBuildArtifactContract.ts](./webappBuildArtifactContract.ts) checks relative paths and HTML strings, without reading the filesystem. [validateWebappBuildArtifacts.mts](../buildArtifact/validateWebappBuildArtifacts.mts) owns filesystem access and accepts an explicit artifact directory. It reuses the existing build-metadata and public-bundle validators.

The contract checks:

- `index.html`, `auth/index.html` and `unsupported/index.html`, including ordered app, auth and browser-check scripts, loader, runtime, vendor and Dexie scripts.
- Main, auth, browser-check and basic browser-feature-check bundles; runtime/vendor/Dexie chunks and their expected source maps; the loader and generated `sw.js`.
- The PDF.js worker, core-crypto WASM files, MediaPipe WASM assets, and every copied file under webapp `resource/` and `assets/`.
- Local HTML `src`/`href` paths and build metadata/version query values.
- Public-build Datadog exclusions through the existing verifier.

Express supplies `/config.js` and `/libs/wire/telemetry/embed.js`; the contract recognizes these as server resources and does not require them in the static artifact. The validator checks emitted-file presence and HTML order. It does not execute the bundle in a browser or verify dynamic chunk loading at runtime.

Focused contract tests use small in-memory fixtures. The production Webpack build validated 3,820 internal artifact files and 3,769 copied assets; the public build validated 3,810 files and the same copied assets.

## Experiments

Both experiments use the same three entries and fixture code: React/TSX with Emotion, a legacy-decorated service, a CommonJS workspace library, a `Components` alias, an imported JavaScript file, a dynamic import and a computed locale `require()`. The library is prepared through its existing Nx target.

```bash
rtk ./bin/yarn clean:build-experiments
rtk /usr/bin/time -p ./bin/yarn build:experiment:tsc-rspack

rtk ./bin/yarn clean:build-experiments
rtk /usr/bin/time -p ./bin/yarn build:experiment:swc-rspack
```

For warm runs, invoke the same build command again without cleaning. Generated JavaScript, source maps, `.tsbuildinfo` and Rspack cache stay under ignored `dist/build-experiments/`.

Architecture A uses `tsconfig.emit.json` (`module: esnext`, `target: esnext`, `allowJs`, source maps and incremental state), then bundles the emitted JavaScript without a transpilation loader. Architecture B runs `tsconfig.type-check.json` with `noEmit`, then bundles the fixture sources with `builtin:swc-loader`. SWC gets targets from `browserslist()` so it resolves the same `.browserslistrc` query used by Babel. It uses `env.mode: 'usage'`, `core-js` 3.50.0, automatic Emotion JSX and legacy decorators with metadata disabled.

The fixture statically imports both locale JSON files so `tsc` emits them; TypeScript does not discover files referenced only by the computed `require()`. Rspack then bundles the context require and dynamic import. Both experiments set `emitDecoratorMetadata: false`: current Babel strips TypeScript without emitting `design:paramtypes`, while the repository base TypeScript config defaults metadata emission to true.

## Measurements

Machine: macOS 26.7.1 (Darwin 25.6.0), Mac16,8, Apple M4 Pro, 12 cores, 48 GB RAM. Node 24.21.0, Yarn 4.18.1, TypeScript 6.0.3, Rspack CLI 2.2.4 / core 2.2.8 and `core-js` 3.50.0.

Times are wall-clock seconds for the complete Nx/Yarn experiment command, including the app `tsc` emit or no-emit check and Rspack. The `commons-lib` Nx cache was prewarmed for cold runs; `clean:build-experiments` cleared the experiment output and compiler/bundler caches before each cold trial. Cold architecture order alternated. The OS page cache was not flushed. Warm runs retained TypeScript incremental state and Rspack persistent cache. App-edit runs changed one expression in `main.tsx`. Shared-library runs changed a comment in `StringUtil.ts` to invalidate the Nx library build without changing runtime behavior. These are process-restart rebuilds, not a long-running watch benchmark.

The A/B timings are not a fully equivalent compiler benchmark: B lowers syntax to the production Browserslist targets and injects usage-based `core-js` polyfills, while A emits `target: esnext` JavaScript without that browser transformation or polyfill injection. The timings compare the practical prototype pipelines, but they do not isolate compiler speed or represent identical browser output. Source-edit measurements restart the commands with warm caches; they do not measure rebuild latency in persistent watch processes or the coordination behavior of long-running watchers.

| Measurement | A: `tsc` emits | B: `tsc` checks + SWC |
|---|---:|---:|
| Cold end-to-end (three runs; median) | 2.51, 2.51, 2.46 s; **2.51 s** | 2.43, 2.48, 2.48 s; **2.48 s** |
| Warm, no source change (three runs; median) | 2.28, 2.33, 2.34 s; **2.33 s** | 2.34, 2.35, 2.35 s; **2.35 s** |
| One app `.tsx` edit (three runs; median) | 2.53, 2.79, 2.47 s; **2.53 s** | 2.60, 2.43, 2.38 s; **2.43 s** |
| Shared library edit (three runs; median) | 2.89, 2.76, 2.83 s; **2.83 s** | 2.87, 2.79, 2.75 s; **2.79 s** |
| Generated JavaScript | 8 files; 73,621 bytes | 8 files; 92,572 bytes |
| Source maps | 8; final maps name emitted `.js` modules | 8; maps name original `.ts`/`.tsx` sources and injected `core-js` |
| Peak memory | Not measured | Not measured |

The raw JavaScript sizes are not equivalent outputs: A leaves `target: esnext` syntax and does not inject polyfills; B applies the production browser query and usage-based polyfills. The B maps include `core-js` modules for the fixture’s `flatMap` use. A’s final maps did not chain the `.ts` inputs through TypeScript’s emitted maps; adding and evaluating a source-map loader would be extra work. Peak RSS was unavailable because macOS `time -l` could not read a restricted kernel statistic in this environment.

| Concern | A: `tsc` emits | B: `tsc` checks + SWC |
|---|---|---|
| App compilation steps | One TypeScript check-and-emit process, then Rspack bundles emitted JavaScript | One no-emit TypeScript check, then Rspack/SWC compiles and bundles TypeScript |
| Watch coordination | Two app processes; Rspack must consume TSC output after each emit | Two app processes observe the source tree; no emitted-file handoff |
| Aliases and shared libraries | TS paths remain in emitted JavaScript. The experiment emits aliased `commons` source that Rspack does not consume; Rspack uses Nx-built CommonJS output | TSC checks source aliases and Rspack bundles the Nx-built CommonJS output |
| Incremental state | `.tsbuildinfo`, emitted JS/maps and Rspack persistent cache must stay in sync | `.tsbuildinfo` and Rspack persistent cache; no app JS output tree to invalidate |
| Browser support and maps | Needs a browser syntax policy, polyfills and source-map chaining beyond `tsc` | Uses resolved Browserslist targets and usage polyfills; maps point to original source |
| Failure reporting and CI | The `tsc` check-and-emit step must finish before Rspack; scripts stop on the first nonzero exit | The no-emit check must finish before Rspack; scripts stop on the first nonzero exit |

## Findings and limits

- Cold and warm totals are effectively tied for this small fixture. The difference is below the noise expected from process startup and cannot predict a full-app build.
- `tsc` has no Browserslist target mode and does not inject missing browser APIs. Keeping A compatible would require manually maintained polyfills and an explicit syntax-target policy, or another transform after `tsc`. That weakens the single-compiler benefit.
- The SWC Emotion transform is documented as experimental. Both SWC decorator and JSX compilation succeeded, but the prototype did not render the generated app or verify Emotion class-name parity and decorator-driven dependency injection at runtime.
- The computed locale require and dynamic import produced bundled chunks in both experiments. The prototype did not exercise browser loading of those chunks, generated production HTML, service worker generation, WASM loading or public-build exclusions under Rspack.
- Watch coordination was not benchmarked. Both options need a type-check process and a Rspack watch process alongside existing Nx library watchers. A adds an emitted-file handoff that must finish before Rspack consumes changes; B watches the same source tree and avoids that synchronization boundary.
- This representative subset is not a full-app Rspack comparison. Migrating the complete Webpack plugin, loader, HTML, copy and Workbox setup is outside this PR.

## Next migration steps

1. Add an opt-in full-app Rspack configuration using architecture B and the current `.browserslistrc` resolution. Keep the Webpack target as the production default.
2. Port entry splitting, aliases/fallbacks, CSS, HTML templates, copied assets, WASM/PDF worker handling and public Datadog replacements. Rspack’s HTML plugin has behavioral differences from HtmlWebpackPlugin; use the [HTML migration guide](https://www.rspack.dev/guide/languages/html) while preserving the script-order contract.
3. Evaluate the Workbox replacement and service-worker output; Rspack lists [`@aaroon/workbox-rspack-plugin`](https://www.rspack.dev/plugins/community-plugin-compatibility) as the alternative to `workbox-webpack-plugin`.
4. Run the artifact validator against internal and public Rspack output, then add browser smoke coverage for entry startup, dynamic locale loading, service worker, WASM and PDF.js worker behavior.
5. Measure the full app and development watch cycle, including library changes and peak RSS. Only then remove Webpack/Babel in a later PR.

Rspack documentation used: [built-in SWC loader](https://www.rspack.dev/guide/features/builtin-swc-loader), [Webpack migration](https://www.rspack.dev/guide/migration/webpack), and [community plugin compatibility](https://www.rspack.dev/plugins/community-plugin-compatibility).
