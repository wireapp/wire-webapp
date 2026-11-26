# Experimental call notes

Enable the `note-taker` startup feature toggle, for example with `?enabled-features=note-taker`, then open Call notes from the call controls. Click Enable note taker to load the speech worker and selected model. Closing the panel keeps transcription running; Stop ends capture and finishes queued audio. Notes remain local and can be exported as Markdown. Notes generation is outside this experiment.

## Self-hosted models

Tiny, base and small Whisper models are versioned under `apps/webapp/assets/noteTakerModels`. ONNX weights use Git LFS. Before building from a checkout that skipped LFS downloads, run:

```sh
git lfs pull --include="apps/webapp/assets/noteTakerModels/**"
```

Build and release checkouts fetch these assets. Rspack verifies the expected files exist with their full sizes, copies them into `/assets/noteTakerModels`, and copies the ONNX runtime files into `/min/onnxruntime`. The existing webapp server serves both directories. Missing assets or LFS pointers fail the build. Runtime model requests are same-origin; remote model loading is disabled.

The complete CPU and GPU variants take approximately 1.3 GB, which increases build artifacts and deployment images. Browsers download only the selected model/backend when transcription is explicitly enabled; automatic GPU fallback can also download its CPU weights. Browser cache retention depends on browser storage policies.

## Updating model assets

`tools/noteTakerModels/modelManifest.json` records upstream repositories, immutable revisions, filenames, byte sizes and SHA-256 hashes. The browser catalog in `speechModels.ts` must use the same revisions. To prepare or verify model files when updating the manifest:

```sh
node tools/noteTakerModels/prepareModels.mts
```

This maintenance command downloads from pinned upstream URLs and verifies hashes; normal builds use the checked-in LFS assets. Update source notices and licenses alongside model changes. Commit the manifest, catalog and assets together. Run `git lfs fsck` before pushing.

## Limits

WebGPU is preferred when available; WASM is the fallback. Live drafts can change as longer chunks finish. AVS 10.6.12 supplies participant identity through its existing audio callback when the startup flag is enabled. Identity updates are rate limited upstream and are not sample-accurate diarization. Overlapping speech and receiver slot changes can therefore produce imperfect speaker labels. The worker and audio capture belong to the session, independently of panel visibility.
