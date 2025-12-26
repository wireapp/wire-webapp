# Background Effects V2

Production-grade background blur and virtual background pipeline that avoids WebRTC Insertable Streams. It processes the original camera track, renders to a canvas (via WebGL2 or Canvas2D), and exposes a processed track using `canvas.captureStream()`.

## Features

- Worker + OffscreenCanvas + WebGL2 preferred pipeline.
- Low-res segmentation (MediaPipe Selfie Segmentation).
- Joint bilateral smoothing + temporal stabilization + GPU compositing.
- Adaptive quality tiers (A-D) with cadence and blur tuning.
- Backpressure to avoid unbounded frame queues.
- Debug modes: mask overlay, mask only, edge only.
- Fallbacks: main-thread WebGL2, Canvas2D compositing, pass-through.

## Example usage

```ts
import {BackgroundEffectsController} from 'Repositories/media/backgroundEffectsV2/effects/BackgroundEffectsController';

const controller = new BackgroundEffectsController();
const stream = await navigator.mediaDevices.getUserMedia({video: {width: 1280, height: 720}});
const inputTrack = stream.getVideoTracks()[0];

const {outputTrack, stop} = await controller.start(inputTrack, {
  mode: 'blur',
  blurStrength: 0.6,
  quality: 'auto',
  targetFps: 30,
});

// Publish outputTrack via RTCPeerConnection
const pc = new RTCPeerConnection();
pc.addTrack(outputTrack, new MediaStream([outputTrack]));

// Toggle effects at runtime
controller.setMode('virtual');
controller.setBackgroundSource(document.querySelector('#bgImage') as HTMLImageElement);
controller.setDebugMode('maskOverlay');
controller.setBlurStrength(0.3);

// Stop pipeline
stop();
```

## Capability detection

`effects/capability.ts` detects OffscreenCanvas, Worker, WebGL2, `requestVideoFrameCallback`, and WebCodecs.

Pipeline selection order:

1. Worker + OffscreenCanvas + WebGL2
2. Main-thread WebGL2
3. Canvas2D compositing
4. Pass-through

## Performance tuning

Quality tiers are defined in `quality/QualityController.ts`:

- Tier A: 256x144 segmentation, cadence 1, blur 1/2 res with radius 4
- Tier B: 256x144 segmentation, cadence 2, blur 1/2 res with radius 3
- Tier C: 160x96 segmentation, cadence 2, blur 1/4 res with radius 2
- Tier D: bypass

Use `setQuality('A' | 'B' | 'C' | 'D')` to force a tier, or `setQuality('auto')` to let the controller adapt.

## Debug modes

- `maskOverlay`: mask overlay on video
- `maskOnly`: grayscale mask output
- `edgeOnly`: midrange edges

## Notes

- The worker pipeline uses `createImageBitmap(video)` to transfer frames. Only one frame is kept in flight; new frames overwrite the pending one.
- Background images are transferred once; background video frames are sampled at ~15fps.
- The module uses MediaPipe assets from `/assets/mediapipe-models/selfie_segmenter.tflite` and `/min/mediapipe/wasm`.
