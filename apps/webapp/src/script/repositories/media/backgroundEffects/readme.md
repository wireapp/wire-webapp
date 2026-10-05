# Background Effects

## 🚧 Limited Release - Real-World Testing Phase

**Status:** Production-ready code, limited to **Edge and Internal releases only** for real-world validation.

### Why Limited Release?

Several components need real-world testing across diverse hardware before general availability:

- **Capability Detection & BackgroundEffectsRenderingPipeline Selection** - Validate automatic pipeline selection (
  worker-webgl2, main-webgl2,
  canvas2d) across different device configurations
- **Quality Controller** - Test adaptive quality tier system (A/B/C/D) under varying CPU/GPU load scenarios on different
  hardware types
- **Performance Characteristics** - Gather data on CPU/GPU utilization patterns across device ranges

### Known Areas for Future Improvement

- **Segmentation Quality** - Edge detection, matte refinement, and temporal stability can be enhanced
- **Overlay Quality** - Blending, color matching, and edge handling improvements

### Next Steps

Collect performance metrics and user feedback from limited release to validate behavior before expanding to broader
rollout.

---

Production-grade background blur and virtual background pipeline that avoids WebRTC Insertable Streams. It processes the
original camera track, renders to a canvas (via WebGL2 or Canvas2D), and exposes a processed track using
`canvas.captureStream()`.

## Features

- **Multi-pipeline architecture**: Worker + OffscreenCanvas + WebGL2 (preferred), main-thread WebGL2, Canvas2D fallback,
  and passthrough
- **ML-based segmentation**: Low-res MediaPipe Selfie Segmentation for person/background separation
- **Advanced post-processing**: Joint bilateral smoothing, temporal stabilization, and GPU compositing
- **Adaptive quality control**: Automatic quality tier adjustment (A-D) based on performance metrics
- **Backpressure management**: Prevents unbounded frame queues with single-frame-in-flight design
- **Debug visualization**: Mask overlay, mask-only, edge-only, and class modes for inspection
- **Runtime controls**: Change mode, quality, blur strength, and background sources without restarting

## Quick Start

```typescript
import { BackgroundEffectsController } from 'Repositories/media/backgroundEffects';

// Create controller
const controller = new BackgroundEffectsController();

// Get camera stream
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
});
const inputTrack = stream.getVideoTracks()[0];

// Start pipeline
const { outputTrack, stop } = await controller.start(inputTrack, {
  mode: 'blur',
  blurStrength: 0.6,
  quality: 'auto',
  targetFps: 30,
});

// Use output track with WebRTC
const pc = new RTCPeerConnection();
pc.addTrack(outputTrack, new MediaStream([outputTrack]));

// Runtime controls
controller.setMode('virtual');
controller.setBackgroundSource(document.querySelector('#bgImage') as HTMLImageElement);
controller.setDebugMode('maskOverlay');
controller.setBlurStrength(0.3);
controller.setQuality('A');

// Cleanup
stop();
```

## API Reference

### BackgroundEffectsController

Main controller class that orchestrates the entire background effects pipeline.

#### Methods

**`start(inputTrack: MediaStreamTrack, opts?: StartOptions): Promise<{outputTrack: MediaStreamTrack; stop: () => void}>`
**

Starts the background effects pipeline. Detects browser capabilities, selects optimal pipeline, initializes components,
and begins frame processing.

- `inputTrack`: Input video track (e.g., from `getUserMedia`)
- `opts`: Configuration options (all optional with defaults)
- Returns: Promise resolving to output track and stop function

**`setMode(mode: EffectMode): void`**

Changes the effect mode at runtime.

- `mode`: `'blur'` | `'virtual'` | `'passthrough'`

**`setBlurStrength(value: number): void`**

Sets blur strength for blur effect mode. Value is clamped to [0, 1].

- `value`: Blur strength (0 = no blur, 1 = maximum blur)

**`setBackgroundSource(source: HTMLImageElement | HTMLVideoElement | ImageBitmap): void`**

Sets the background source for virtual background mode.

- `source`: Image element, video element, or ImageBitmap
- For images: Converted to ImageBitmap and transferred once
- For videos: Sampled at ~15fps and converted to ImageBitmap frames

**`setDebugMode(mode: DebugMode): void`**

Sets debug visualization mode for inspecting segmentation masks.

- `mode`: `'off'` | `'maskOverlay'` | `'maskOnly'` | `'edgeOnly'` | `'classOverlay'` | `'classOnly'`

**`setQuality(mode: QualityMode): void`**

Sets quality mode. 'auto' enables adaptive quality based on performance metrics.

- `mode`: `'auto'` | `'A'` | `'B'` | `'C'` | `'D'`

**`stop(): void`**

Stops the pipeline and cleans up all resources. Should be called when the pipeline is no longer needed.

### StartOptions

Configuration options for `start()` method:

```typescript
interface StartOptions {
  targetFps?: number; // Default: 30
  quality?: QualityMode; // Default: 'auto'
  qualityPolicy?:
    | 'auto'
    | 'conservative'
    | 'aggressive'
    | ((capabilities) => {
    initialTier: 'A' | 'B' | 'C' | 'D';
    segmentationModelByTier?: Partial<Record<'A' | 'B' | 'C' | 'D', string>>;
  });
  debugMode?: DebugMode; // Default: 'off'
  mode?: EffectMode; // Default: 'blur'
  blurStrength?: number; // Default: 0.5 (0-1)
  backgroundImage?: HTMLImageElement | ImageBitmap;
  backgroundVideo?: HTMLVideoElement;
  backgroundColor?: string;
  segmentationModelPath?: string; // Optional override for all tiers
  segmentationModelByTier?: Partial<Record<'A' | 'B' | 'C' | 'D', string>>;
  useWorker?: boolean; // Default: true
  pipelineOverride?: PipelineType;
  onMetrics?: (metrics: Metrics) => void;
}
```

### Utility Functions

**`detectCapabilities(): CapabilityInfo`**

Detects browser capabilities required for background effects. Returns boolean flags for:

- `webgl2`: WebGL2 support
- `worker`: Web Worker support
- `offscreenCanvas`: OffscreenCanvas support
- `requestVideoFrameCallback`: RequestVideoFrameCallback API support

**`choosePipeline(cap: CapabilityInfo, preferWorker?: boolean): BackgroundEffectsRenderingPipeline`**

Selects the optimal rendering pipeline based on browser capabilities.

- `cap`: Capability information from `detectCapabilities()`
- `preferWorker`: If true, prefers worker-based pipeline when available
- Returns: `'worker-webgl2'` | `'main-webgl2'` | `'canvas2d'` | `'passthrough'`

### Types

- `EffectMode`: `'blur'` | `'virtual'` | `'passthrough'`
- `DebugMode`: `'off'` | `'maskOverlay'` | `'maskOnly'` | `'edgeOnly'` | `'classOverlay'` | `'classOnly'`
- `QualityMode`: `'auto'` | `'A'` | `'B'` | `'C'` | `'D'`
- `Metrics`: Performance metrics tracked during frame processing

## Architecture

### BackgroundEffectsRenderingPipeline Selection

The module automatically selects the best available pipeline based on browser capabilities:

1. **worker-webgl2** (preferred): Worker + OffscreenCanvas + WebGL2

- Best performance (background thread processing)
- Requires: Worker, OffscreenCanvas, WebGL2

2. **main-webgl2**: Main-thread WebGL2

- High quality (GPU-accelerated)
- Requires: WebGL2

3. **canvas2d**: Canvas2D compositing

- Fallback (CPU-based, widely supported)
- Lower visual quality than WebGL2

4. **passthrough**: No processing

- Last resort when no other pipeline is available

### Processing BackgroundEffectsRenderingPipeline

1. **Frame extraction**: `VideoSource` extracts frames using `requestVideoFrameCallback` (preferred) or
   `requestAnimationFrame` (fallback)
2. **Segmentation**: MediaPipe Selfie Segmentation generates low-res mask (256x256, 256x144, or 160x96)
3. **Mask refinement**: WebGL pipelines apply joint bilateral filter + temporal smoothing + upsampling
4. **Compositing**: GPU-accelerated blur or virtual background replacement (WebGL) or CPU compositing (Canvas2D)
5. **Output**: Rendered to canvas, exposed via `canvas.captureStream()`

### Post-Processing Today

**WebGL pipelines (worker-webgl2 / main-webgl2)**

- Mask upsample (linear sampling) from low-res segmentation to refined resolution
- Joint bilateral filtering using the video frame as guidance (edge-preserving smoothing)
- Temporal smoothing (EMA) using the previous refined mask
- Separable Gaussian blur (downsample + horizontal + vertical passes)
- Matte thresholds + soft edges for blur/virtual compositing

**Canvas2D pipeline**

- CPU compositing with blur filter and mask-based alpha
- Temporal smoothing for masks (EMA) and mask reuse between segmentation frames
- No bilateral refinement (kept lightweight for low-end devices)

### Quality Tiers

Quality tiers balance visual quality against performance:

- **Tier A**: 256x256 segmentation, cadence 1, blur 1/2 res with radius 4
- **Tier B**: 256x144 segmentation, cadence 2, blur 1/2 res with radius 3
- **Tier C**: 160x96 segmentation, cadence 3, blur 1/4 res with radius 2
- **Tier D**: Bypass (no processing)

Use `setQuality('A' | 'B' | 'C' | 'D')` to force a tier, or `setQuality('auto')` to let the controller adapt based on
performance metrics.

### Debug Modes

- `maskOverlay`: Overlays green tint on mask areas
- `maskOnly`: Displays only the segmentation mask as grayscale
- `edgeOnly`: Highlights mask edges using edge detection
- `classOverlay`: Overlays class colors from multiclass segmentation
- `classOnly`: Shows class colors only (no video)

## Module Structure

```
BackgroundEffects/
├── effects/
│   ├── backgroundEffectsController.ts  # Main controller
│   ├── frameSource.ts                  # Frame extraction adapter
│   ├── videoSource.ts                  # Frame extraction
│   └── capability.ts                   # Capability detection
├── pipelines/                          # BackgroundEffectsRenderingPipeline implementations
├── renderer/
│   └── webGlRenderer.ts                # WebGL2 rendering pipeline
├── segmentation/
│   └── segmenter.ts                   # MediaPipe segmentation
├── quality/
│   └── qualityController.ts           # Adaptive quality control
├── worker/
│   └── bgfx.worker.ts                 # Worker-based pipeline
├── shaders/                           # GLSL shaders
├── debug/
│   └── debugModes.ts                  # Debug mode utilities
├── shared/                             # Shared helpers (mask, timestamps)
├── testBasic.ts                       # Basic pipeline test harness
├── backgroundEffectsWorkerTypes.ts                           # Type definitions
└── index.ts                           # Public API exports
```

## Implementation Details

### Frame Transfer

- **Frame source**: `FrameSource` produces `ImageBitmap` frames using `MediaStreamTrackProcessor` or a `VideoSource`
  fallback.
- **Worker pipeline**: Transfers `ImageBitmap` frames to the worker; if a frame is in flight, the next frame is dropped.
- **Main pipeline**: Frames are processed directly on the main thread.

### Background Sources

- **Images**: Converted to ImageBitmap and transferred once (worker) or stored (main)
- **Videos**: Sampled at ~15fps and converted to ImageBitmap frames

### Resource Management

- Background sources (ImageBitmaps) are properly closed when replaced or stopped
- Worker is terminated on stop
- Renderer and segmenter are destroyed on stop
- Video source and output track are stopped on stop

## Dependencies

- Tier A defaults to the selfie segmentation model: `/assets/mediapipe-models/selfie_segmenter_landscape.tflite`
- Tier B/C/D use MediaPipe selfie segmentation: `/assets/mediapipe-models/selfie_segmenter_landscape.tflite`
- Multiclass segmentation is optional and can be provided via `segmentationModelByTier` or config override.
- MediaPipe WASM: `/min/mediapipe/wasm`

## Notes

- The Canvas2D fallback honors `mode`, `debugMode`, `backgroundSource`, and `blurStrength`, but visual quality is lower
  than WebGL2.
- Passthrough mode is used when no other pipeline is available or when explicitly selected.
- The module uses MediaPipe assets from `/assets/mediapipe-models/selfie_segmenter_landscape.tflite` and
  `/min/mediapipe/wasm`. Optional multiclass assets are not bundled by default.
- All runtime controls (`setMode`, `setBlurStrength`, etc.) work with both worker and main pipelines.

## Future Exploration

- Higher quality mask refinement (guided filter, morphological ops, or ML post-processing)
- Improved edge handling (halo suppression, adaptive matte thresholds, temporal stability)
- Color matching/relighting for virtual backgrounds
- Class-aware compositing (multi-class segmentation use cases)
- Dynamic post-processing knobs per quality tier and device class
